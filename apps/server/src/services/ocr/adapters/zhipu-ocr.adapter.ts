import { Service } from 'typedi';
import urllib from 'urllib';

import { config } from '../../../config/config.js';
import {
  IOcrAdapter,
  OcrOptions,
  OcrResult,
  LayoutDetail,
  RawLayoutDetail,
} from '../interfaces.js';

/**
 * 智谱 OCR 适配器响应类型
 */
interface ZhipuOcrResponse {
  id: string;
  created: number;
  model: string;
  md_results: string;
  layout_details?: LayoutDetail[][];
  layout_visualization?: string[];
  data_info?: {
    num_pages: number;
    pages: { width: number; height: number }[];
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  request_id?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 智谱 OCR 适配器
 * 使用 GLM-OCR 模型解析文档和图片的布局并提取文本内容
 */
@Service()
export class ZhipuOcrAdapter implements IOcrAdapter {
  readonly provider = 'zhipu' as const;

  private get apiKey(): string {
    return config.ocr.providers.zhipu.apiKey;
  }

  private get baseURL(): string {
    return config.ocr.providers.zhipu.baseURL;
  }

  /**
   * 解析图片/文档获取文本
   */
  async parse(files: string | string[]): Promise<OcrResult[]> {
    return this.parseWithOptions(files, {});
  }

  /**
   * 解析图片/文档获取文本（带选项）
   */
  async parseWithOptions(files: string | string[], options: OcrOptions): Promise<OcrResult[]> {
    if (!this.apiKey) {
      throw new Error('ZHIPU_API_KEY is not configured');
    }

    const fileList = Array.isArray(files) ? files : [files];
    if (fileList.length === 0) {
      throw new Error('At least one file must be provided');
    }

    const results: OcrResult[] = [];

    // 智谱 API 目前只支持单文件处理，需要逐个调用
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const result = await this.parseSingleFile(file, i, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 解析单个文件
   */
  private async parseSingleFile(
    file: string,
    index: number,
    options: OcrOptions
  ): Promise<OcrResult> {
    const requestBody: Record<string, unknown> = {
      model: 'glm-ocr',
      file: file,
    };

    // 添加可选参数
    if (options.returnCropImages) {
      requestBody.return_crop_images = options.returnCropImages;
    }
    if (options.needLayoutVisualization) {
      requestBody.need_layout_visualization = options.needLayoutVisualization;
    }
    if (options.startPageId) {
      requestBody.start_page_id = options.startPageId;
    }
    if (options.endPageId) {
      requestBody.end_page_id = options.endPageId;
    }
    if (options.requestId) {
      requestBody.request_id = options.requestId;
    }
    if (options.userId) {
      requestBody.user_id = options.userId;
    }

    try {
      const response = await urllib.request(`${this.baseURL}/paas/v4/layout_parsing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        contentType: 'json',
        dataType: 'json',
        data: requestBody,
        timeout: 120000, // 2 分钟超时
      });

      const statusCode =
        typeof response.status === 'number' ? response.status : response.res?.statusCode;

      if (!statusCode || statusCode < 200 || statusCode >= 300) {
        throw new Error(
          `Zhipu OCR API call failed: ${statusCode ?? 'unknown'} - ${
            response.res?.statusMessage ?? 'Unknown error'
          }`
        );
      }

      const data = response.data as ZhipuOcrResponse;

      if (data.error) {
        throw new Error(`Zhipu OCR API error: ${data.error.code} - ${data.error.message}`);
      }

      // 转换布局详情 - API 返回的是 LayoutDetail[][]，取第一个元素
      const rawLayoutDetails = data.layout_details?.[0] as RawLayoutDetail[] | undefined;
      const layoutDetails: LayoutDetail[] | undefined = rawLayoutDetails?.map((item) => ({
        index: item.index,
        label: item.label,
        bbox2d: item.bbox_2d,
        content: item.content,
        height: item.height,
        width: item.width,
      }));

      return {
        index: index,
        text: data.md_results || '',
        originalFile: file,
        layoutDetails,
        layoutVisualization: data.layout_visualization,
      };
    } catch (error) {
      throw new Error(
        `Zhipu OCR failed for file ${index}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
