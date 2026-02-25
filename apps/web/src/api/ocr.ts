import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${API_BASE_URL}/api/v1/ocr`;

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
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
   * 解析图片获取文本内容
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

    throw new Error(response.data.message || 'OCR parsing failed');
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
