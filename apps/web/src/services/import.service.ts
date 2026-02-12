/**
 * Import Service
 * Handles importing memos from exported JSON files
 */

import { Service } from '@rabjs/react';
import type { CreateMemoDto } from '@aimo/dto';
import { attachmentApi } from '../api/attachment';
import * as memoApi from '../api/memo';

// Type definitions for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

// Export JSON structure types
export interface ExportedAttachment {
  id: string;
  filename: string;
  file_path: string;
  type: string;
  size: string;
  created_at: string;
}

export interface ExportedMemoRelation {
  memo: {
    name: string;
    snippet: string;
  };
  relatedMemo: {
    name: string;
    snippet: string;
  };
  type: string;
}

export interface ExportedMemo {
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
  display_time: string;
  visibility: string;
  pinned: boolean;
  tags: string[];
  snippet: string;
  state: string;
  attachments?: ExportedAttachment[];
  relations?: ExportedMemoRelation[];
}

export interface ExportedData {
  memos: ExportedMemo[];
}

// Import progress state
export interface ImportProgress {
  totalMemos: number;
  processedMemos: number;
  successfulMemos: number;
  failedMemos: number;
  currentMemoContent: string;
  status: 'idle' | 'reading' | 'importing' | 'creating-relations' | 'completed' | 'error';
  errorMessage?: string;
  errors: Array<{
    memoContent: string;
    error: string;
  }>;
}

// Memo mapping from exported name to created ID
type MemoNameMapping = Record<string, string>;

export class ImportService extends Service {
  // State for import progress
  importProgress: ImportProgress = {
    totalMemos: 0,
    processedMemos: 0,
    successfulMemos: 0,
    failedMemos: 0,
    currentMemoContent: '',
    status: 'idle',
    errors: [],
  };

  /**
   * Select and validate folder using File System Access API
   */
  async selectAndValidateFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      // Check if memos_export.json exists
      try {
        await dirHandle.getFileHandle('memos_export.json');
        return dirHandle;
      } catch {
        throw new Error('文件夹中不存在 memos_export.json 文件');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  /**
   * Read memos_export.json from directory
   */
  async readExportJson(dirHandle: FileSystemDirectoryHandle): Promise<ExportedData> {
    try {
      const fileHandle = await dirHandle.getFileHandle('memos_export.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text) as ExportedData;

      if (!Array.isArray(data.memos)) {
        throw new Error('无效的导出文件格式');
      }

      return data;
    } catch (error) {
      throw new Error(
        `读取导出文件失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * Get file from attachments folder
   */
  private async getAttachmentFile(
    dirHandle: FileSystemDirectoryHandle,
    filePath: string
  ): Promise<File | null> {
    try {
      // file_path format: "attachments/filename"
      const parts = filePath.split('/').filter(p => p);
      
      if (parts.length === 0) return null;

      let currentHandle: FileSystemHandle = dirHandle;

      // Navigate to the nested directory/file
      for (let i = 0; i < parts.length - 1; i++) {
        try {
          currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(
            parts[i]
          );
        } catch {
          return null; // Directory not found
        }
      }

      // Get the file
      const fileName = parts[parts.length - 1];
      try {
        const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(
          fileName
        );
        return await fileHandle.getFile();
      } catch {
        return null; // File not found
      }
    } catch (error) {
      console.error(`Failed to get attachment file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Upload attachments for a memo and return attachment IDs
   */
  private async uploadMemoAttachments(
    dirHandle: FileSystemDirectoryHandle,
    exportedMemo: ExportedMemo
  ): Promise<string[]> {
    if (!exportedMemo.attachments || exportedMemo.attachments.length === 0) {
      return [];
    }

    const attachmentIds: string[] = [];

    for (const attachment of exportedMemo.attachments) {
      try {
        const file = await this.getAttachmentFile(dirHandle, attachment.file_path);
        
        if (!file) {
          console.warn(`Attachment not found: ${attachment.file_path}`);
          continue;
        }

        const uploadedAttachment = await attachmentApi.upload(file);
        attachmentIds.push(uploadedAttachment.attachmentId);
      } catch (error) {
        console.warn(
          `Failed to upload attachment ${attachment.file_path}:`,
          error instanceof Error ? error.message : 'unknown error'
        );
        // Continue with other attachments
      }
    }

    return attachmentIds;
  }

  /**
   * Check if a memo with the same content already exists
   */
  private async checkMemoExists(content: string): Promise<string | null> {
    try {
      // Fetch all memos to check for duplicates
      const response = await memoApi.getMemos({
        page: 1,
        limit: 1000, // Get a large batch to check for duplicates
      });

      if (response.code === 0 && response.data?.items) {
        for (const existingMemo of response.data.items) {
          if (existingMemo.content === content) {
            return existingMemo.memoId;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to check for duplicate memo:', error);
      return null;
    }
  }

  /**
   * Import all memos and return mapping of exported name to created ID
   */
  async importAllMemos(
    dirHandle: FileSystemDirectoryHandle,
    exportedData: ExportedData
  ): Promise<MemoNameMapping> {
    this.importProgress = {
      totalMemos: exportedData.memos.length,
      processedMemos: 0,
      successfulMemos: 0,
      failedMemos: 0,
      currentMemoContent: '',
      status: 'importing',
      errors: [],
    };

    const memoNameMapping: MemoNameMapping = {};

    for (const exportedMemo of exportedData.memos) {
      try {
        // Check for duplicate
        const existingMemoId = await this.checkMemoExists(exportedMemo.content);
        
        if (existingMemoId) {
          // Memo already exists, just map it
          memoNameMapping[exportedMemo.name] = existingMemoId;
          console.log(`Memo already exists, skipping: ${existingMemoId}`);
          // Update progress reactively
          this.importProgress = { ...this.importProgress, processedMemos: this.importProgress.processedMemos + 1 };
          continue;
        }

        // Upload attachments
        const attachmentIds = await this.uploadMemoAttachments(dirHandle, exportedMemo);

        // Create memo with original timestamps
        const createdAtMs = new Date(exportedMemo.created_at).getTime();
        const updatedAtMs = new Date(exportedMemo.updated_at).getTime();

        const createData: CreateMemoDto = {
          content: exportedMemo.content,
          attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
          createdAt: createdAtMs,
          updatedAt: updatedAtMs,
        };

        const response = await memoApi.createMemo(createData);

        if (response.code === 0 && response.data?.memo) {
          memoNameMapping[exportedMemo.name] = response.data.memo.memoId;
          // Update progress reactively - increment both processedMemos and successfulMemos
          this.importProgress = {
            ...this.importProgress,
            processedMemos: this.importProgress.processedMemos + 1,
            successfulMemos: this.importProgress.successfulMemos + 1,
            currentMemoContent: exportedMemo.content.substring(0, 50),
          };
        } else {
          throw new Error('Server returned error code');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        // Update progress reactively when error occurs
        this.importProgress = {
          ...this.importProgress,
          processedMemos: this.importProgress.processedMemos + 1,
          failedMemos: this.importProgress.failedMemos + 1,
          currentMemoContent: exportedMemo.content.substring(0, 50),
          errors: [
            ...this.importProgress.errors,
            {
              memoContent: exportedMemo.content.substring(0, 50),
              error: errorMsg,
            },
          ],
        };
        console.error(`Failed to import memo "${exportedMemo.name}":`, error);
      }
    }

    return memoNameMapping;
  }

  /**
   * Create relations between memos
   */
  async createMemoRelations(
    exportedData: ExportedData,
    memoNameMapping: MemoNameMapping
  ): Promise<void> {
    this.importProgress = { ...this.importProgress, status: 'creating-relations', processedMemos: 0 };

    let processedRelations = 0;

    for (const exportedMemo of exportedData.memos) {
      const currentMemoId = memoNameMapping[exportedMemo.name];

      if (!currentMemoId || !exportedMemo.relations) {
        continue;
      }

      // Collect all relation IDs for this memo first
      const relationIds: string[] = [];

      for (const relation of exportedMemo.relations) {
        const relatedMemoId = memoNameMapping[relation.relatedMemo.name];

        // Skip self-references and duplicates
        if (relatedMemoId && relatedMemoId !== currentMemoId && !relationIds.includes(relatedMemoId)) {
          relationIds.push(relatedMemoId);
        } else if (!relatedMemoId) {
          console.warn(`Related memo not found: ${relation.relatedMemo.name}`);
        } else if (relatedMemoId === currentMemoId) {
          console.warn(`Skipping self-reference for memo: ${currentMemoId}`);
        }

        processedRelations++;
        // Update progress reactively
        this.importProgress = { ...this.importProgress, processedMemos: processedRelations };
      }

      // If there are relations to create, update the memo
      if (relationIds.length > 0) {
        try {
          // Get the current memo to get its full data
          const currentMemoResponse = await memoApi.getMemo(currentMemoId);

          if (currentMemoResponse.code === 0 && currentMemoResponse.data) {
            const currentMemo = currentMemoResponse.data;

            // Prepare update data
            const updateData = {
              content: currentMemo.content,
              attachments: currentMemo.attachments?.map(a => a.attachmentId),
              relationIds: relationIds,
            };

            await memoApi.updateMemo(currentMemoId, updateData);
          }
        } catch (error) {
          console.warn(
            `Failed to create relations for memo ${currentMemoId}:`,
            error instanceof Error ? error.message : 'unknown error'
          );
          // Continue with other memos
        }
      }
    }
  }

  /**
   * Main import function orchestrating the full import process
   */
  async import(): Promise<{ success: boolean; stats: ImportProgress }> {
    try {
      // Select folder
      const dirHandle = await this.selectAndValidateFolder();
      if (!dirHandle) {
        // User cancelled - not an error, just return without setting error status
        return { success: false, stats: this.importProgress };
      }

      // Read export JSON
      this.importProgress.status = 'reading';
      const exportedData = await this.readExportJson(dirHandle);

      // Import memos
      const memoNameMapping = await this.importAllMemos(dirHandle, exportedData);

      // Create relations
      if (Object.keys(memoNameMapping).length > 0) {
        await this.createMemoRelations(exportedData, memoNameMapping);
      }

      this.importProgress.status = 'completed';
      return { success: true, stats: this.importProgress };
    } catch (error) {
      this.importProgress.status = 'error';
      this.importProgress.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, stats: this.importProgress };
    }
  }

  /**
   * Reset import progress
   */
  resetProgress(): void {
    this.importProgress = {
      totalMemos: 0,
      processedMemos: 0,
      successfulMemos: 0,
      failedMemos: 0,
      currentMemoContent: '',
      status: 'idle',
      errors: [],
    };
  }
}
