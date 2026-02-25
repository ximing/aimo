import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { parentPort } from 'node:worker_threads';

import archiver from 'archiver';

interface CompressionTask {
  lancedbPath: string;
  destPath: string;
  taskId: string;
}

interface CompressionResult {
  taskId: string;
  success: boolean;
  error?: string;
}

/**
 * Worker thread for handling database compression
 * Prevents blocking the main event loop during tar.gz compression
 */
async function handleCompressionTask(task: CompressionTask): Promise<CompressionResult> {
  try {
    console.log(`[Worker] Starting compression task ${task.taskId}`);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(task.destPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: 6, // Balance between speed and compression
        },
      });

      // Error handlers
      output.on('error', (error) => {
        console.error('[Worker] Output stream error:', error);
        reject(error);
      });

      archive.on('error', (error) => {
        console.error('[Worker] Archive error:', error);
        reject(error);
      });

      // Pipe archive to output
      archive.pipe(output);

      // Add the database directory to archive
      const dbDirName = path.basename(task.lancedbPath);
      archive.directory(task.lancedbPath, dbDirName);

      // Finalize archive
      archive.finalize();

      // Resolve when archive has been fully written
      output.on('finish', () => {
        console.log(`[Worker] Compression completed: ${task.taskId}`);
        resolve();
      });
    });

    return {
      taskId: task.taskId,
      success: true,
    };
  } catch (error) {
    console.error(`[Worker] Compression failed for task ${task.taskId}:`, error);
    return {
      taskId: task.taskId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (task: CompressionTask) => {
    const result = await handleCompressionTask(task);
    parentPort?.postMessage(result);
  });
}
