/**
 * OCR 适配器接口
 * 定义标准输入输出，方便后续扩展其他 OCR 供应商
 */

/**
 * OCR 原始响应布局详情（与 API 返回格式一致）
 */
export interface RawLayoutDetail {
  index: number;
  label: 'image' | 'text' | 'formula' | 'table';
  bbox_2d: number[];
  content: string;
  height: number;
  width: number;
}

/**
 * OCR 识别选项
 */
export interface OcrOptions {
  /** 是否需要截图信息 */
  returnCropImages?: boolean;
  /** 是否需要详细布局图片结果信息 */
  needLayoutVisualization?: boolean;
  /** PDF 起始页码 */
  startPageId?: number;
  /** PDF 结束页码 */
  endPageId?: number;
  /** 唯一请求标识符 */
  requestId?: string;
  /** 终端用户 ID，用于滥用监控 */
  userId?: string;
}

/**
 * 单个图片的 OCR 结果
 */
export interface OcrResult {
  /** 图片索引 */
  index: number;
  /** 识别的文本内容 */
  text: string;
  /** 原始文件（URL 或 base64） */
  originalFile: string;
  /** 布局详细信息（可选） */
  layoutDetails?: LayoutDetail[];
  /** 识别结果图片 URL（可选） */
  layoutVisualization?: string[];
}

/**
 * 布局详情元素
 */
export interface LayoutDetail {
  /** 元素序号 */
  index: number;
  /** 元素类型: image/text/formula/table */
  label: 'image' | 'text' | 'formula' | 'table';
  /** 归一化的元素坐标 [x1, y1, x2, y2] */
  bbox2d: number[];
  /** 元素内容 */
  content: string;
  /** 页面高度 */
  height: number;
  /** 页面宽度 */
  width: number;
}

/**
 * OCR 供应商类型
 */
export type OcrProviderType = 'zhipu' | 'baidu' | 'ali' | 'tencent';

/**
 * OCR 适配器接口
 */
export interface IOcrAdapter {
  /** 供应商名称 */
  readonly provider: OcrProviderType;

  /**
   * 解析图片/文档获取文本
   * @param files - 单个或多个图片（URL 或 base64）
   * @returns 每个图片对应的 OCR 结果
   */
  parse(files: string | string[]): Promise<OcrResult[]>;

  /**
   * 解析图片/文档获取文本（带选项）
   * @param files - 单个或多个图片（URL 或 base64）
   * @param options - OCR 选项
   * @returns 每个图片对应的 OCR 结果
   */
  parseWithOptions(files: string | string[], options: OcrOptions): Promise<OcrResult[]>;
}
