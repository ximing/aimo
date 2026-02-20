/**
 * ASR Service
 * Fun-ASR speech-to-text service using DashScope API
 */

import { Service } from 'typedi';

import { config } from '../config/config.js';

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
  };
  request_id: string;
  code?: string;
  message?: string;
}

interface DashScopeQueryResponse {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    results?: Array<{
      transcription_url: string;
      subtask_status: 'SUCCEEDED' | 'FAILED';
    }>;
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
    this.baseURL = config.asr.baseURL;
    this.apiKey = config.asr.apiKey;
    this.model = config.asr.model;
  }

  /**
   * Check if ASR service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.baseURL;
  }

  /**
   * Submit transcription task(s) to Fun-ASR API
   * @param request - Transcription request with file URLs and optional language hints
   */
  async submitTranscription(request: ASRTranscribeRequestDto): Promise<ASRTaskResponseDto> {
    if (!this.isConfigured()) {
      throw new Error('ASR service is not configured. Please set FUN_ASR_API_KEY or DASHSCOPE_API_KEY.');
    }

    const { fileUrls, languageHints } = request;

    if (!fileUrls || fileUrls.length === 0) {
      throw new Error('At least one file URL is required');
    }

    const response = await fetch(`${this.baseURL}/services/audio/asr/transcription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        file_urls: fileUrls,
        language_hints: languageHints,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASR API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as DashScopeTaskResponse;

    if (data.code) {
      throw new Error(`ASR API error: ${data.code} - ${data.message}`);
    }

    return {
      taskId: data.output.task_id,
      requestId: data.request_id,
      status: 'PENDING',
    };
  }

  /**
   * Query the status of a transcription task
   * @param taskId - Task ID returned from submitTranscription
   */
  async queryTaskStatus(taskId: string): Promise<ASRTaskStatusDto> {
    if (!this.isConfigured()) {
      throw new Error('ASR service is not configured. Please set FUN_ASR_API_KEY or DASHSCOPE_API_KEY.');
    }

    const response = await fetch(
      `${this.baseURL}/services/audio/asr/transcription?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASR API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as DashScopeQueryResponse;

    if (data.code) {
      throw new Error(`ASR API error: ${data.code} - ${data.message}`);
    }

    let completedTime: number | undefined;
    if (data.output.task_status === 'SUCCEEDED') {
      completedTime = Date.now();
    }

    return {
      taskId: data.output.task_id,
      requestId: data.request_id,
      status: data.output.task_status,
      message: data.output.task_status === 'FAILED' ? 'Transcription failed' : undefined,
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
        return status;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Transcription timeout after ${timeoutMs}ms`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Get transcription results from result URL
   * @param transcriptionUrl - URL to fetch transcription result from
   */
  private async fetchTranscriptionResult(transcriptionUrl: string): Promise<ASRTranscriptionResultDto> {
    const response = await fetch(transcriptionUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch transcription result: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ASRTranscriptionResultDto;
  }

  /**
   * Get full transcription results
   * @param taskId - Task ID returned from submitTranscription
   */
  async getTranscriptionResult(taskId: string): Promise<ASRResultDto> {
    // First query the task status to get result URLs
    const status = await this.queryTaskStatus(taskId);

    if (status.status !== 'SUCCEEDED') {
      return {
        results: [],
        status: status.status as 'SUCCEEDED' | 'FAILED',
        requestId: status.requestId,
      };
    }

    // Get the task details again to get result URLs
    const response = await fetch(
      `${this.baseURL}/services/audio/asr/transcription?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`ASR API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DashScopeQueryResponse;
    const results: ASRTranscriptionResultDto[] = [];

    if (data.output.results) {
      for (const result of data.output.results) {
        if (result.subtask_status === 'SUCCEEDED') {
          const transcriptionResult = await this.fetchTranscriptionResult(result.transcription_url);
          results.push(transcriptionResult);
        }
      }
    }

    return {
      results,
      status: 'SUCCEEDED',
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
    // Submit the transcription task
    const task = await this.submitTranscription(request);

    // Wait for completion
    await this.waitForTranscription(task.taskId, pollIntervalMs, timeoutMs);

    // Get results
    return await this.getTranscriptionResult(task.taskId);
  }
}
