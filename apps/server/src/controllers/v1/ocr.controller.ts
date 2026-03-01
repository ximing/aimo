/**
 * OCR Controller
 * Handles OCR (Optical Character Recognition) requests for image text extraction
 */

import { JsonController, Post, Get, Body, QueryParams } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { OcrService } from '../../services/ocr/ocr.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { OcrProviderType, OcrOptions, OcrResult } from '../../services/ocr/interfaces.js';

/**
 * OCR 解析请求 DTO
 */
export interface OcrParseRequestDto {
  /** 图片文件 URL 或 Base64 编码（单个或多个） */
  files: string | string[];
  /** 可选的 OCR 供应商 */
  provider?: OcrProviderType;
}

/**
 * OCR 完整解析请求 DTO
 */
export interface OcrParseFullRequestDto extends OcrParseRequestDto {
  /** OCR 选项 */
  options?: OcrOptions;
}

/**
 * OCR 状态响应 DTO
 */
export interface OcrStatusResponseDto {
  /** OCR 是否启用 */
  enabled: boolean;
  /** 默认供应商 */
  defaultProvider: OcrProviderType;
  /** 可用供应商列表 */
  availableProviders: OcrProviderType[];
}

@Service()
@JsonController('/api/v1/ocr')
export class OcrV1Controller {
  constructor(private ocrService: OcrService) {}

  /**
   * 解析图片获取文本内容
   * POST /api/v1/ocr/parse
   *
   * @param files - 图片 URL 或 Base64（单个或数组）
   * @param provider - 可选的 OCR 供应商
   * @returns 识别出的文本数组
   */
  @Post('/parse')
  async parse(@Body() request: OcrParseRequestDto) {
    try {
      // 验证请求参数
      if (!request.files || (Array.isArray(request.files) && request.files.length === 0)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'At least one file is required');
      }

      // 检查 OCR 服务是否启用
      if (!this.ocrService.isEnabled()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'OCR service is not enabled');
      }

      const texts = await this.ocrService.parseText(request.files, request.provider);
      return ResponseUtility.success({ texts });
    } catch (error) {
      logger.error('OCR parse error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'OCR parsing failed'
      );
    }
  }

  /**
   * 解析图片获取完整的 OCR 结果（包含布局信息）
   * POST /api/v1/ocr/parse-full
   *
   * @param files - 图片 URL 或 Base64（单个或数组）
   * @param provider - 可选的 OCR 供应商
   * @param options - 可选的 OCR 选项
   * @returns 完整的 OCR 结果数组
   */
  @Post('/parse-full')
  async parseFull(@Body() request: OcrParseFullRequestDto) {
    try {
      // 验证请求参数
      if (!request.files || (Array.isArray(request.files) && request.files.length === 0)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'At least one file is required');
      }

      // 检查 OCR 服务是否启用
      if (!this.ocrService.isEnabled()) {
        return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'OCR service is not enabled');
      }

      const results: OcrResult[] = await this.ocrService.parse(
        request.files,
        request.provider,
        request.options
      );
      return ResponseUtility.success({ results });
    } catch (error) {
      logger.error('OCR parse-full error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'OCR parsing failed'
      );
    }
  }

  /**
   * 获取 OCR 服务状态
   * GET /api/v1/ocr/status
   *
   * @returns OCR 服务状态信息
   */
  @Get('/status')
  async getStatus() {
    try {
      const status: OcrStatusResponseDto = {
        enabled: this.ocrService.isEnabled(),
        defaultProvider: this.ocrService.getDefaultProvider(),
        availableProviders: this.ocrService.getAvailableProviders(),
      };
      return ResponseUtility.success(status);
    } catch (error) {
      logger.error('OCR status error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to get OCR status'
      );
    }
  }

  /**
   * 获取所有可用的 OCR 供应商
   * GET /api/v1/ocr/providers
   *
   * @returns 可用的 OCR 供应商列表
   */
  @Get('/providers')
  async getProviders() {
    try {
      const providers = this.ocrService.getAvailableProviders();
      return ResponseUtility.success({ providers });
    } catch (error) {
      logger.error('OCR providers error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to get OCR providers'
      );
    }
  }
}
