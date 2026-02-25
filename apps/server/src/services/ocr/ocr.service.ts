import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { OcrProviderType, OcrOptions, OcrResult } from './interfaces.js';
import { ZhipuOcrAdapter } from './adapters/zhipu-ocr.adapter.js';

/**
 * OCR 服务
 * 统一管理所有 OCR 适配器，提供标准化的文本识别能力
 */
@Service()
export class OcrService {
  private adapters: Map<OcrProviderType, ZhipuOcrAdapter>;

  constructor() {
    this.adapters = new Map();
    this.registerAdapters();
  }

  /**
   * 注册所有 OCR 适配器
   */
  private registerAdapters(): void {
    // 注册智谱 OCR 适配器
    this.adapters.set('zhipu', new ZhipuOcrAdapter());
    // 后续可以在这里添加更多适配器
  }

  /**
   * 获取指定供应商的适配器
   */
  private getAdapter(provider?: OcrProviderType): ZhipuOcrAdapter {
    const targetProvider = provider || config.ocr.defaultProvider;
    const adapter = this.adapters.get(targetProvider);

    if (!adapter) {
      throw new Error(`OCR provider '${targetProvider}' is not registered`);
    }

    return adapter;
  }

  /**
   * 解析图片获取文本
   * @param files - 单个或多个图片（URL 或 base64）
   * @param provider - 可选的 OCR 供应商
   * @returns 每个图片对应的文本数组
   */
  async parseText(files: string | string[], provider?: OcrProviderType): Promise<string[]> {
    const adapter = this.getAdapter(provider);
    const results = await adapter.parse(files);
    return results.map((result) => result.text);
  }

  /**
   * 解析图片获取完整 OCR 结果
   * @param files - 单个或多个图片（URL 或 base64）
   * @param provider - 可选的 OCR 供应商
   * @returns 每个图片对应的完整 OCR 结果
   */
  async parse(
    files: string | string[],
    provider?: OcrProviderType,
    options?: OcrOptions
  ): Promise<OcrResult[]> {
    const adapter = this.getAdapter(provider);

    if (options) {
      return adapter.parseWithOptions(files, options);
    }

    return adapter.parse(files);
  }

  /**
   * 检查 OCR 是否启用
   */
  isEnabled(): boolean {
    return config.ocr.enabled;
  }

  /**
   * 获取默认供应商
   */
  getDefaultProvider(): OcrProviderType {
    return config.ocr.defaultProvider;
  }

  /**
   * 获取所有可用的供应商
   */
  getAvailableProviders(): OcrProviderType[] {
    return Array.from(this.adapters.keys());
  }
}
