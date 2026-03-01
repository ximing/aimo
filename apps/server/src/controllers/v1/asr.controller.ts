/**
 * ASR Controller
 * Handles speech-to-text transcription requests
 */

import { JsonController, Post, Get, Param, Body, HttpCode } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ASRService } from '../../services/asr.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type {
  ASRTranscribeRequestDto,
  ASRTaskResponseDto,
  ASRTaskStatusDto,
  ASRResultDto,
} from '@aimo/dto';

@Service()
@JsonController('/api/v1/asr')
export class ASRV1Controller {
  constructor(private asrService: ASRService) {}

  /**
   * Submit transcription task
   * POST /api/v1/asr/transcribe
   */
  @Post('/transcribe')
  @HttpCode(202)
  async transcribe(@Body() request: ASRTranscribeRequestDto) {
    try {
      // Validate request
      if (!request.fileUrls || request.fileUrls.length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'At least one file URL is required');
      }

      // Check if service is configured
      if (!this.asrService.isConfigured()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'ASR service is not configured');
      }

      const result = await this.asrService.submitTranscription(request);
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('ASR transcription error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Transcription failed'
      );
    }
  }

  /**
   * Query transcription task status
   * GET /api/v1/asr/task/:taskId
   */
  @Get('/task/:taskId')
  async getTaskStatus(@Param('taskId') taskId: string) {
    try {
      if (!taskId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Task ID is required');
      }

      if (!this.asrService.isConfigured()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'ASR service is not configured');
      }

      const result = await this.asrService.queryTaskStatus(taskId);
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('ASR task status error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to query task status'
      );
    }
  }

  /**
   * Wait for transcription to complete and get results
   * GET /api/v1/asr/wait/:taskId
   * This is a blocking endpoint that waits for transcription to complete
   */
  @Get('/wait/:taskId')
  async waitForTranscription(@Param('taskId') taskId: string) {
    try {
      if (!taskId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Task ID is required');
      }

      if (!this.asrService.isConfigured()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'ASR service is not configured');
      }

      // Wait for transcription (max 5 minutes)
      await this.asrService.waitForTranscription(taskId);

      // Get results
      const result = await this.asrService.getTranscriptionResult(taskId);
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('ASR wait error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to wait for transcription'
      );
    }
  }

  /**
   * Get transcription result
   * GET /api/v1/asr/result/:taskId
   */
  @Get('/result/:taskId')
  async getResult(@Param('taskId') taskId: string) {
    try {
      if (!taskId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Task ID is required');
      }

      if (!this.asrService.isConfigured()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'ASR service is not configured');
      }

      const result = await this.asrService.getTranscriptionResult(taskId);
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('ASR result error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to get transcription result'
      );
    }
  }

  /**
   * Submit and wait for transcription (convenience endpoint)
   * POST /api/v1/asr/transcribe-and-wait
   */
  @Post('/transcribe-and-wait')
  @HttpCode(202)
  async transcribeAndWait(@Body() request: ASRTranscribeRequestDto) {
    try {
      if (!request.fileUrls || request.fileUrls.length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'At least one file URL is required');
      }

      if (!this.asrService.isConfigured()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'ASR service is not configured');
      }

      // Transcribe with automatic wait (max 5 minutes)
      const result = await this.asrService.transcribe(request);
      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('ASR transcribe and wait error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Transcription failed'
      );
    }
  }
}
