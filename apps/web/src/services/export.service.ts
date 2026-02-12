/**
 * Export Service
 * Handles exporting memos and attachments to a zip file
 */

import { Service } from '@rabjs/react';
import JSZip from 'jszip';
import type { MemoWithAttachmentsDto } from '@aimo/dto';
import * as memoApi from '../api/memo';
import * as exportApi from '../api/export';
import type {
  ExportedData,
  ExportedMemo,
  ExportedAttachment,
  ExportedMemoRelation,
} from './import.service';

// Export progress state
export interface ExportProgress {
  totalMemos: number;
  processedMemos: number;
  totalAttachments: number;
  downloadedAttachments: number;
  currentMemoContent: string;
  status:
    | 'idle'
    | 'fetching-memos'
    | 'downloading-attachments'
    | 'creating-zip'
    | 'completed'
    | 'error';
  errorMessage?: string;
  errors: Array<{
    attachmentId: string;
    error: string;
  }>;
}

export class ExportService extends Service {
  // State for export progress
  exportProgress: ExportProgress = {
    totalMemos: 0,
    processedMemos: 0,
    totalAttachments: 0,
    downloadedAttachments: 0,
    currentMemoContent: '',
    status: 'idle',
    errors: [],
  };

  /**
   * Fetch all memos with pagination
   */
  private async fetchAllMemos(): Promise<MemoWithAttachmentsDto[]> {
    const allMemos: MemoWithAttachmentsDto[] = [];
    let page = 1;
    const limit = 100; // Fetch 100 memos per page

    while (true) {
      const response = await memoApi.getMemos({ page, limit });

      if (response.code !== 0 || !response.data?.items) {
        throw new Error('Failed to fetch memos');
      }

      const { items, pagination } = response.data;

      // Fetch detailed memo info for each item (to get relations)
      for (const item of items) {
        const detailResponse = await memoApi.getMemo(item.memoId);
        if (detailResponse.code === 0 && detailResponse.data) {
          allMemos.push(detailResponse.data);
        }
      }

      // Check if there are more pages
      if (page >= pagination.totalPages) {
        break;
      }

      page++;
    }

    return allMemos;
  }

  /**
   * Convert internal memo to exported format
   */
  private convertMemoToExportFormat(memo: MemoWithAttachmentsDto, index: number): ExportedMemo {
    // Generate exported attachments
    const exportedAttachments: ExportedAttachment[] =
      memo.attachments?.map((att) => ({
        id: att.attachmentId,
        filename: att.filename,
        file_path: `attachments/${att.filename}`,
        type: att.type,
        size: att.size.toString(),
        created_at: new Date(att.createdAt).toISOString(),
      })) || [];

    // Generate exported relations
    const exportedRelations: ExportedMemoRelation[] =
      memo.relations?.map((rel) => ({
        memo: {
          name: `memos/${index}`,
          snippet: memo.content.substring(0, 50),
        },
        relatedMemo: {
          name: rel.memoId, // Will be converted to proper name later
          snippet: rel.content?.substring(0, 50) || '',
        },
        type: 'REFERENCE',
      })) || [];

    return {
      name: `memos/${index}`,
      content: memo.content,
      created_at: new Date(memo.createdAt).toISOString(),
      updated_at: new Date(memo.updatedAt).toISOString(),
      display_time: new Date(memo.createdAt).toISOString(),
      visibility: 'PRIVATE',
      pinned: false,
      tags: [], // We don't have tags in the current schema
      snippet: memo.content.substring(0, 100),
      state: 'NORMAL',
      attachments: exportedAttachments.length > 0 ? exportedAttachments : undefined,
      relations: exportedRelations.length > 0 ? exportedRelations : undefined,
    };
  }

  /**
   * Download a single attachment with retry logic
   */
  private async downloadAttachmentWithRetry(
    attachmentId: string,
    maxRetries: number = 3
  ): Promise<Blob | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const blob = await exportApi.downloadAttachment(attachmentId);
        return blob;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(
            `Failed to download attachment ${attachmentId} after ${maxRetries} attempts:`,
            error
          );
          return null;
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    return null;
  }

  /**
   * Download all attachments with concurrency control
   */
  private async downloadAllAttachments(
    memos: ExportedMemo[],
    maxConcurrent: number = 5
  ): Promise<Map<string, Blob>> {
    const attachmentMap = new Map<string, Blob>();

    // Collect all unique attachments
    const allAttachments: Array<{ id: string; filename: string }> = [];
    for (const memo of memos) {
      if (memo.attachments) {
        for (const att of memo.attachments) {
          if (!allAttachments.find((a) => a.id === att.id)) {
            allAttachments.push({ id: att.id, filename: att.filename });
          }
        }
      }
    }

    this.exportProgress = {
      ...this.exportProgress,
      totalAttachments: allAttachments.length,
      status: 'downloading-attachments',
    };

    // Download with concurrency control
    const downloadQueue = [...allAttachments];
    const workers: Promise<void>[] = [];

    const worker = async () => {
      while (downloadQueue.length > 0) {
        const attachment = downloadQueue.shift();
        if (!attachment) break;

        const blob = await this.downloadAttachmentWithRetry(attachment.id);

        if (blob) {
          attachmentMap.set(attachment.filename, blob);
        } else {
          // Record error but continue
          this.exportProgress = {
            ...this.exportProgress,
            errors: [
              ...this.exportProgress.errors,
              {
                attachmentId: attachment.id,
                error: 'Download failed after retries',
              },
            ],
          };
        }

        // Update progress
        this.exportProgress = {
          ...this.exportProgress,
          downloadedAttachments: this.exportProgress.downloadedAttachments + 1,
        };
      }
    };

    // Start workers
    for (let i = 0; i < maxConcurrent; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    return attachmentMap;
  }

  /**
   * Create zip file with memos and attachments
   */
  private async createZipFile(
    exportData: ExportedData,
    attachmentMap: Map<string, Blob>
  ): Promise<Blob> {
    this.exportProgress = { ...this.exportProgress, status: 'creating-zip' };

    const zip = new JSZip();

    // Add memos_export.json
    const jsonContent = JSON.stringify(exportData, null, 2);
    zip.file('memos_export.json', jsonContent);

    // Add attachments folder
    const attachmentsFolder = zip.folder('attachments');
    if (attachmentsFolder) {
      for (const [filename, blob] of attachmentMap.entries()) {
        attachmentsFolder.file(filename, blob);
      }
    }

    // Generate zip
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  /**
   * Trigger browser download
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Main export function
   */
  async export(): Promise<{ success: boolean; stats: ExportProgress }> {
    try {
      // Reset progress
      this.resetProgress();

      // Step 1: Fetch all memos
      this.exportProgress.status = 'fetching-memos';
      const memos = await this.fetchAllMemos();

      if (memos.length === 0) {
        throw new Error('No memos to export');
      }

      this.exportProgress = {
        ...this.exportProgress,
        totalMemos: memos.length,
      };

      // Step 2: Convert to export format
      const exportedMemos: ExportedMemo[] = [];
      const memoIdToNameMap = new Map<string, string>();

      for (let i = 0; i < memos.length; i++) {
        const memo = memos[i];
        const exportedMemo = this.convertMemoToExportFormat(memo, i);
        exportedMemos.push(exportedMemo);
        memoIdToNameMap.set(memo.memoId, exportedMemo.name);

        this.exportProgress = {
          ...this.exportProgress,
          processedMemos: i + 1,
          currentMemoContent: memo.content.substring(0, 50),
        };
      }

      // Fix relation names
      for (const memo of exportedMemos) {
        if (memo.relations) {
          for (const rel of memo.relations) {
            const properName = memoIdToNameMap.get(rel.relatedMemo.name);
            if (properName) {
              rel.relatedMemo.name = properName;
            }
          }
        }
      }

      const exportData: ExportedData = { memos: exportedMemos };

      // Step 3: Download attachments
      const attachmentMap = await this.downloadAllAttachments(exportedMemos);

      // Step 4: Create zip file
      const zipBlob = await this.createZipFile(exportData, attachmentMap);

      // Step 5: Trigger download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `aimo-export-${timestamp}.zip`;
      this.triggerDownload(zipBlob, filename);

      this.exportProgress.status = 'completed';
      return { success: true, stats: this.exportProgress };
    } catch (error) {
      this.exportProgress.status = 'error';
      this.exportProgress.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, stats: this.exportProgress };
    }
  }

  /**
   * Reset export progress
   */
  resetProgress(): void {
    this.exportProgress = {
      totalMemos: 0,
      processedMemos: 0,
      totalAttachments: 0,
      downloadedAttachments: 0,
      currentMemoContent: '',
      status: 'idle',
      errors: [],
    };
  }
}
