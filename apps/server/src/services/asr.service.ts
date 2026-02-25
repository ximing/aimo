/**
 * ASR Service
 * Fun-ASR speech-to-text service using DashScope API
 */

import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

import type {
  ASRTaskResponseDto,
  ASRTaskStatusDto,
  ASRTranscribeRequestDto,
  ASRResultDto,
  ASRTranscriptionResultDto,
} from '@aimo/dto';

interface DashScopeTaskResponse {
  output: {
    task_id: string;
    task_status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  };
  request_id: string;
  code?: string;
  message?: string;
}

interface DashScopeQueryResult {
  file_url: string;
  transcription_url?: string;
  subtask_status: 'SUCCEEDED' | 'FAILED';
  code?: string;
  message?: string;
}

interface DashScopeQueryResponse {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    submit_time?: string;
    scheduled_time?: string;
    end_time?: string;
    results?: DashScopeQueryResult[];
  };
  request_id: string;
  code?: string;
  message?: string;
}

/**
 * ASR Service for speech-to-text using Fun-ASR
 * Handles async transcription tasks via DashScope API
 */
@Service()
export class ASRService {
  private baseURL: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseURL = config.asr.baseURL.replace(/\/$/, '');
    this.apiKey = config.asr.apiKey;
    this.model = config.asr.model;
    logger.info('ASR Service initialized', { baseURL: this.baseURL, model: this.model });
  }

  /**
   * Check if ASR service is properly configured
   */
  isConfigured(): boolean {
    return config.asr.enabled && !!this.apiKey && !!this.baseURL && !!this.model;
  }

  private buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseURL}${normalizedPath}`;
  }

  private validateFileUrls(fileUrls: string[]): void {
    if (fileUrls.length > 100) {
      throw new Error('At most 100 file URLs are supported per request');
    }

    const allowedProtocols = new Set(['http:', 'https:', 'oss:']);

    for (const fileUrl of fileUrls) {
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(fileUrl);
      } catch {
        throw new Error(`Invalid file URL: ${fileUrl}`);
      }

      if (!allowedProtocols.has(parsedUrl.protocol)) {
        throw new Error(
          `Unsupported file URL protocol "${parsedUrl.protocol}". Only HTTP/HTTPS or OSS URLs are allowed.`
        );
      }
    }
  }

  private getSubtaskErrorMessage(results?: DashScopeQueryResult[]): string | undefined {
    if (!results) {
      return undefined;
    }

    const failedResult = results.find((result) => result.subtask_status === 'FAILED');

    if (!failedResult) {
      return undefined;
    }

    if (failedResult.code || failedResult.message) {
      return `${failedResult.code ?? 'SubtaskFailed'}${
        failedResult.message ? ` - ${failedResult.message}` : ''
      }`;
    }

    return 'Transcription failed';
  }

  private async requestDashScope<T extends { code?: string; message?: string }>(
    url: string,
    init: RequestInit
  ): Promise<T> {
    const response = await fetch(url, init);
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `ASR API error: ${response.status} ${response.statusText} - ${responseText || 'Unknown error'}`
      );
    }

    const data = responseText ? (JSON.parse(responseText) as T) : ({} as T);

    if (data.code) {
      throw new Error(`ASR API error: ${data.code} - ${data.message}`);
    }

    return data;
  }

  private async queryTaskDetails(taskId: string): Promise<DashScopeQueryResponse> {
    return this.requestDashScope<DashScopeQueryResponse>(
      this.buildApiUrl(`/tasks/${encodeURIComponent(taskId)}`),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
  }

  /**
   * Submit transcription task(s) to Fun-ASR API
   * @param request - Transcription request with file URLs and optional language hints
   */
  async submitTranscription(request: ASRTranscribeRequestDto): Promise<ASRTaskResponseDto> {
    if (!this.isConfigured()) {
      throw new Error(
        'ASR service is not configured. Please set FUN_ASR_API_KEY or DASHSCOPE_API_KEY.'
      );
    }

    const { fileUrls, languageHints } = request;

    if (!fileUrls || fileUrls.length === 0) {
      throw new Error('At least one file URL is required');
    }

    this.validateFileUrls(fileUrls);

    const parameters: Record<string, unknown> = {};

    if (languageHints && languageHints.length > 0) {
      parameters.language_hints = languageHints;
    }

    const payload: Record<string, unknown> = {
      model: this.model,
      input: {
        file_urls: fileUrls,
      },
    };

    if (Object.keys(parameters).length > 0) {
      payload.parameters = parameters;
    }

    const data = await this.requestDashScope<DashScopeTaskResponse>(
      this.buildApiUrl('/services/audio/asr/transcription'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(payload),
      }
    );

    logger.info('ASR transcription task submitted', {
      taskId: data.output.task_id,
      requestId: data.request_id,
      fileCount: fileUrls.length,
    });

    return {
      taskId: data.output.task_id,
      requestId: data.request_id,
      status: data.output.task_status ?? 'PENDING',
    };
  }

  /**
   * Query the status of a transcription task
   * @param taskId - Task ID returned from submitTranscription
   */
  async queryTaskStatus(taskId: string): Promise<ASRTaskStatusDto> {
    if (!this.isConfigured()) {
      throw new Error(
        'ASR service is not configured. Please set FUN_ASR_API_KEY or DASHSCOPE_API_KEY.'
      );
    }

    const data = await this.queryTaskDetails(taskId);

    let completedTime: number | undefined;

    if (data.output.task_status === 'SUCCEEDED') {
      completedTime = data.output.end_time ? new Date(data.output.end_time).getTime() : Date.now();
    }

    const message =
      data.output.task_status === 'FAILED'
        ? (data.message ??
          this.getSubtaskErrorMessage(data.output.results) ??
          'Transcription failed')
        : undefined;

    return {
      taskId: data.output.task_id,
      requestId: data.request_id,
      status: data.output.task_status,
      message,
      completedTime,
    };
  }

  /**
   * Wait for transcription task to complete
   * @param taskId - Task ID returned from submitTranscription
   * @param pollIntervalMs - Polling interval in milliseconds (default: 2000ms)
   * @param timeoutMs - Maximum wait time in milliseconds (default: 300000ms = 5 minutes)
   */
  async waitForTranscription(
    taskId: string,
    pollIntervalMs: number = 2000,
    timeoutMs: number = 300_000
  ): Promise<ASRTaskStatusDto> {
    const startTime = Date.now();

    while (true) {
      const status = await this.queryTaskStatus(taskId);

      if (status.status === 'SUCCEEDED' || status.status === 'FAILED') {
        logger.debug('ASR task status check', { taskId, status: status.status });
        return status;
      }

      if (Date.now() - startTime > timeoutMs) {
        logger.error(`ASR transcription timeout after ${timeoutMs}ms`, { taskId });
        throw new Error(`Transcription timeout after ${timeoutMs}ms`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Get transcription results from result URL
   * @param transcriptionUrl - URL to fetch transcription result from
   */
  private async fetchTranscriptionResult(
    transcriptionUrl: string
  ): Promise<ASRTranscriptionResultDto> {
    const response = await fetch(transcriptionUrl);
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch transcription result: ${response.status} ${response.statusText} - ${responseText || 'Unknown error'}`
      );
    }

    try {
      return JSON.parse(responseText) as ASRTranscriptionResultDto;
    } catch (error) {
      throw new Error(
        `Invalid transcription result JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get full transcription results
   * @param taskId - Task ID returned from submitTranscription
   */
  async getTranscriptionResult(taskId: string): Promise<ASRResultDto> {
    const data = await this.queryTaskDetails(taskId);

    if (data.output.task_status !== 'SUCCEEDED') {
      logger.warn('ASR task not succeeded', {
        taskId,
        status: data.output.task_status,
        requestId: data.request_id,
      });
      return {
        results: [],
        status: 'FAILED',
        requestId: data.request_id,
      };
    }

    const successfulResults = data.output.results?.filter(
      (result) => result.subtask_status === 'SUCCEEDED' && result.transcription_url
    );

    if (!successfulResults || successfulResults.length === 0) {
      return {
        results: [],
        status: 'FAILED',
        requestId: data.request_id,
      };
    }

    const transcriptionResults = await Promise.allSettled(
      successfulResults.map((result) => this.fetchTranscriptionResult(result.transcription_url!))
    );

    const results = transcriptionResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );

    return {
      results,
      status: results.length > 0 ? 'SUCCEEDED' : 'FAILED',
      requestId: data.request_id,
    };
  }

  /**
   * Submit transcription and wait for result (convenience method)
   * @param request - Transcription request
   * @param pollIntervalMs - Polling interval in milliseconds
   * @param timeoutMs - Maximum wait time in milliseconds
   */
  async transcribe(
    request: ASRTranscribeRequestDto,
    pollIntervalMs: number = 2000,
    timeoutMs: number = 300_000
  ): Promise<ASRResultDto> {
    const startTime = Date.now();
    logger.info('Starting ASR transcription', {
      fileCount: request.fileUrls.length,
      languageHints: request.languageHints,
    });

    // Submit the transcription task
    const task = await this.submitTranscription(request);

    // Wait for completion
    await this.waitForTranscription(task.taskId, pollIntervalMs, timeoutMs);

    // Get results
    const result = await this.getTranscriptionResult(task.taskId);
    const duration = Date.now() - startTime;

    if (result.status === 'SUCCEEDED') {
      logger.info('ASR transcription completed', {
        taskId: task.taskId,
        resultCount: result.results.length,
        durationMs: duration,
      });
    } else {
      logger.error('ASR transcription failed', { taskId: task.taskId, durationMs: duration });
    }

    return result;
  }
}
