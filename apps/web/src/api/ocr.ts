import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${API_BASE_URL}/api/v1/ocr`;

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}

export interface OcrParseResponse {
  texts: string[];
}

export interface OcrStatusResponse {
  enabled: boolean;
  defaultProvider: string;
  availableProviders: string[];
}

/**
 * 将文件转换为 Base64 编码
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ocrApi = {
  /**
   * 通过文件 URL 解析获取文本内容
   * @param urls - 文件 URL（单个或多个），支持图片和 PDF
   * @returns 识别出的文本数组
   */
  async parseByUrls(urls: string | string[]): Promise<string[]> {
    const urlList = Array.isArray(urls) ? urls : [urls];

    const response = await axios.post<ApiResponse<OcrParseResponse>>(
      `${API_BASE}/parse`,
      { files: urlList },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code === 0) {
      return response.data.data.texts;
    }

    // 透传后端错误消息，优先使用 msg 字段
    const errorMsg = response.data.msg || response.data.message || 'OCR parsing failed';
    throw new Error(errorMsg);
  },

  /**
   * 解析图片获取文本内容（兼容旧版本，使用 Base64）
   * @param files - 图片文件（单个或多个）
   * @returns 识别出的文本数组
   */
  async parse(files: File | File[]): Promise<string[]> {
    const fileList = Array.isArray(files) ? files : [files];

    // 将所有文件转换为 Base64
    const base64Files = await Promise.all(fileList.map(fileToBase64));

    const response = await axios.post<ApiResponse<OcrParseResponse>>(
      `${API_BASE}/parse`,
      { files: base64Files },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code === 0) {
      return response.data.data.texts;
    }

    // 透传后端错误消息，优先使用 msg 字段
    const errorMsg = response.data.msg || response.data.message || 'OCR parsing failed';
    throw new Error(errorMsg);
  },

  /**
   * 获取 OCR 服务状态
   */
  async getStatus(): Promise<OcrStatusResponse> {
    const response = await axios.get<ApiResponse<OcrStatusResponse>>(`${API_BASE}/status`);

    if (response.data.code === 0) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Get OCR status failed');
  },
};
