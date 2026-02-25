# OCR API 文档

OCR (Optical Character Recognition) API 提供图片文本识别功能，支持从图片中提取文字内容。

## 基础信息

| 项目     | 值            |
| -------- | ------------- |
| 基础路径 | `/api/v1/ocr` |
| 认证方式 | JWT Token     |
| 请求格式 | JSON          |

## 供应商类型

```typescript
type OcrProviderType = 'zhipu' | 'baidu' | 'ali' | 'tencent';
```

当前默认供应商：智谱 (zhipu)

---

## API 端点

### 1. 解析图片获取文本

从图片中识别并提取文字内容。

**端点**: `POST /api/v1/ocr/parse`

**请求体**:

```typescript
{
  // 必填，图片文件 URL 或 Base64 编码（单个或多个）
  files: string | string[],
  // 可选，OCR 供应商，默认使用配置中的默认供应商
  provider?: OcrProviderType
}
```

**示例请求**:

```bash
curl -X POST http://localhost:3000/api/v1/ocr/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "files": ["https://example.com/image.jpg"],
    "provider": "zhipu"
  }'
```

**响应成功**:

```typescript
{
  "success": true,
  "data": {
    "texts": [
      "识别出的文本内容1",
      "识别出的文本内容2"
    ]
  },
  "error": null
}
```

---

### 2. 解析图片获取完整结果

从图片中识别文字，并返回完整的 OCR 结果，包含布局信息等详细数据。

**端点**: `POST /api/v1/ocr/parse-full`

**请求体**:

```typescript
{
  // 必填，图片文件 URL 或 Base64 编码（单个或多个）
  files: string | string[],
  // 可选，OCR 供应商，默认使用配置中的默认供应商
  provider?: OcrProviderType,
  // 可选，OCR 选项
  options?: OcrOptions
}
```

**OcrOptions 选项**:

```typescript
{
  // 是否需要截图信息
  returnCropImages?: boolean,
  // 是否需要详细布局图片结果信息
  needLayoutVisualization?: boolean,
  // PDF 起始页码
  startPageId?: number,
  // PDF 结束页码
  endPageId?: number,
  // 唯一请求标识符
  requestId?: string,
  // 终端用户 ID，用于滥用监控
  userId?: string
}
```

**示例请求**:

```bash
curl -X POST http://localhost:3000/api/v1/ocr/parse-full \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "files": ["base64:..."],
    "provider": "zhipu",
    "options": {
      "returnCropImages": true,
      "needLayoutVisualization": true
    }
  }'
```

**响应成功**:

```typescript
{
  "success": true,
  "data": {
    "results": [
      {
        "index": 0,
        "text": "识别出的文本内容",
        "originalFile": "https://example.com/image.jpg",
        "layoutDetails": [
          {
            "index": 0,
            "label": "text",
            "bbox2d": [0, 0, 100, 20],
            "content": "文本内容",
            "height": 200,
            "width": 100
          }
        ],
        "layoutVisualization": ["base64:..."]
      }
    ]
  },
  "error": null
}
```

**LayoutDetail 字段说明**:

| 字段    | 类型     | 说明                                                |
| ------- | -------- | --------------------------------------------------- |
| index   | number   | 元素序号                                            |
| label   | string   | 元素类型: `image` \| `text` \| `formula` \| `table` |
| bbox2d  | number[] | 归一化的元素坐标 [x1, y1, x2, y2]                   |
| content | string   | 元素内容                                            |
| height  | number   | 页面高度                                            |
| width   | number   | 页面宽度                                            |

---

### 3. 获取 OCR 服务状态

获取 OCR 服务的当前状态和配置信息。

**端点**: `GET /api/v1/ocr/status`

**示例请求**:

```bash
curl -X GET http://localhost:3000/api/v1/ocr/status \
  -H "Authorization: Bearer <token>"
```

**响应成功**:

```typescript
{
  "success": true,
  "data": {
    "enabled": true,
    "defaultProvider": "zhipu",
    "availableProviders": ["zhipu"]
  },
  "error": null
}
```

---

### 4. 获取可用供应商列表

获取所有支持的 OCR 供应商列表。

**端点**: `GET /api/v1/ocr/providers`

**示例请求**:

```bash
curl -X GET http://localhost:3000/api/v1/ocr/providers \
  -H "Authorization: Bearer <token>"
```

**响应成功**:

```typescript
{
  "success": true,
  "data": {
    "providers": ["zhipu", "baidu", "ali", "tencent"]
  },
  "error": null
}
```

---

## 错误响应

所有接口的错误响应格式统一：

```typescript
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息描述"
  }
}
```

**常见错误码**:

| 错误码       | 说明                               |
| ------------ | ---------------------------------- |
| PARAMS_ERROR | 请求参数错误                       |
| SYSTEM_ERROR | 系统错误，OCR 服务未启用或处理失败 |

---

## 使用示例

### 前端调用示例

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/ocr',
});

// 解析图片获取文本
async function parseImage(fileUrl: string) {
  const response = await api.post('/parse', {
    files: [fileUrl],
    provider: 'zhipu',
  });
  return response.data.data.texts;
}

// 解析图片获取完整结果（含布局）
async function parseImageFull(fileUrl: string) {
  const response = await api.post('/parse-full', {
    files: [fileUrl],
    provider: 'zhipu',
    options: {
      needLayoutVisualization: true,
    },
  });
  return response.data.data.results;
}
```
