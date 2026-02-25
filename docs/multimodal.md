多模态向量模型将文本、图像或视频转换成统一的1024维浮点数向量，适用于视频分类、图像分类、图文检索等。

## **核心能力**

- **跨模态检索**：实现以文搜图、以图搜视频、以图搜图等跨模态的语义搜索。
- **语义相似度计算**：在统一的向量空间中，衡量不同模态内容之间的语义相似性。
- **内容分类与聚类**：基于内容的语义向量进行智能分组、打标和聚类分析。

> **关键特性**：所有模态（文本、图片、视频）生成的向量都位于同一语义空间，可直接通过计算余弦相似度等方法进行跨模态匹配与比较。关于模型选型和应用方法的更多介绍，参考[文本与多模态向量化](https://help.aliyun.com/zh/model-studio/embedding)。

> 模型介绍、选型建议和使用方法**，**请参考[文本与多模态向量化](https://help.aliyun.com/zh/model-studio/embedding)。

## **模型概览**

### 北京

| **模型名称**                  | **向量维度**                          | **文本长度限制** | **图片大小限制**       | **视频大小限制**                     | **单价（每千输入Token）**          | **免费额度**[（注）](https://help.aliyun.com/zh/model-studio/new-free-quota#591f3dfedfyzj) |
| ----------------------------- | ------------------------------------- | ---------------- | ---------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| qwen3-vl-embedding            | 2560, 2048, 1536, 1024, 768, 512, 256 | 32,000 Token     | 单张大小不超过**5 MB** | 视频文件大小不超过 **50 MB**         | 图片/视频：0.0018元 文本：0.0007元 | 100万Token 有效期：百炼开通后90天内                                                        |
| qwen2.5-vl-embedding          | 2048, 1024, 768, 512                  |
| tongyi-embedding-vision-plus  | 1152, 1024, 512, 256, 128, 64         | 1,024 Token      | 单张大小不超过**3 MB** | 视频文件大小不超过 **10 MB**         | 0.0005元                           |
| tongyi-embedding-vision-flash | 768, 512, 256, 128, 64                | 1,024 Token      | 0.00015元              |
| multimodal-embedding-v1       | 1,024                                 | 512 Token        | 单张大小不超过**3 MB** | 图片/视频：0.0009 元 文本：0.0007 元 |

### 新加坡

| **模型名称**                  | **向量维度**                  | **文本长度限制** | **图片大小限制**                      | **视频大小限制**             | **单价（每千输入Token）** |
| ----------------------------- | ----------------------------- | ---------------- | ------------------------------------- | ---------------------------- | ------------------------- |
| tongyi-embedding-vision-plus  | 1152, 1024, 512, 256, 128, 64 | 1,024 Token      | 最多 **8 张**且单张大小不超过**3 MB** | 视频文件大小不超过 **10 MB** | 0.0005元                  |
| tongyi-embedding-vision-flash | 768, 512, 256, 128, 64        | 1,024 Token      | 0.00015元                             |

### **输入格式与语种限制：**

| **多模态融合向量模型**        |                                                                                              |                                                                    |                                                       |                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| **模型**                      | **文本**                                                                                     | **图片**                                                           | **视频**                                              | **单次请求条数**                                                             |
| qwen3-vl-embedding            | 支持中、英、日、韩、法、德等33种主流语言                                                     | JPEG, PNG, WEBP, BMP, TIFF, ICO, DIB, ICNS, SGI（支持URL或Base64） | MP4, AVI, MOV（仅支持URL）                            | 一次请求中传入内容元素总数不超过 20。图片数量不超过10，视频数量不超过1。     |
| qwen2.5-vl-embedding          | 支持中、英、日、韩、法、德等11种主流语言                                                     | 一次请求内，图片、文本、视频、融合对象每种类型最多出现 1 次。      |
| **多模态独立向量模型**        |                                                                                              |                                                                    |                                                       |                                                                              |
| **模型**                      | **文本**                                                                                     | **图片**                                                           | **视频**                                              | **单次请求条数**                                                             |
| tongyi-embedding-vision-plus  | 中文与英文                                                                                   | JPG, PNG, BMP (支持URL或Base64)                                    | MP4, MPEG, MOV, MPG, WEBM, AVI, FLV, MKV（仅支持URL） | 暂无传入内容元素数量限制，输入内容Token数不超过单批次处理Token数量上限即可。 |
| tongyi-embedding-vision-flash |
| multimodal-embedding-v1       | 一次请求中传入内容元素总数不超过 20；图片、视频各最多 1 条，文本最多 20 条，共享总条数上限。 |

> 接口支持单段文本、单张图片或单个视频文件的上传，也允许不同类型组合（如文本+图片），部分模型支持同类型内容的多个输入（如多张图片），请参考具体模型的限制说明。

## **前提条件**

您需要已[获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)并[配置API Key到环境变量](https://help.aliyun.com/zh/model-studio/configure-api-key-through-environment-variables)。如果通过SDK调用，还需要[安装DashScope SDK](https://help.aliyun.com/zh/model-studio/install-sdk)。

## HTTP调用

`POST https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding`

| ### **请求**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ## 多模态独立向量 > `qwen3-vl-embedding`支持两种使用方式：将文本、图片、视频放在一起输入会生成1个融合向量，分开输入（如下方代码示例中所示）则每个内容生成1个独立向量。 `curl --silent --location --request POST 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header 'Content-Type: application/json' \\ --data '{ "model": "tongyi-embedding-vision-plus", "input": { "contents": [ {"text": "多模态向量模型"}, {"image": "https://img.alicdn.com/imgextra/i3/O1CN01rdstgY1uiZWt8gqSL_!!6000000006071-0-tps-1970-356.jpg"}, {"video": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250107/lbcemt/new+video.mp4"}, {"multi_images": [ "https://img.alicdn.com/imgextra/i2/O1CN019eO00F1HDdlU4Syj5_!!6000000000724-2-tps-2476-1158.png", "https://img.alicdn.com/imgextra/i2/O1CN01dSYhpw1nSoamp31CD_!!6000000005089-2-tps-1765-1639.png" ] } ] } }'` ## 多模态融合向量 > `qwen3-vl-embedding`支持两种使用方式：将文本、图片、视频放在一起输入（如下方代码示例中所示）会生成1个融合向量，分开输入则每个内容生成1个独立向量。 `curl --silent --location --request POST 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header 'Content-Type: application/json' \\ --data '{ "model": "qwen3-vl-embedding", "input": { "contents": [ {"text": "这是一段测试文本，用于生成多模态融合向量", "image": "https://dashscope.oss-cn-beijing.aliyuncs.com/images/256_1.png", "video": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250107/lbcemt/new+video.mp4" } ] }, "parameters": { "dimension": 1024, "output_type": "dense", "fps": 0.5 } }'` |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #### **请求头（Headers）**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Content-Type** `*string*` **（必选）** 请求内容类型。可设置为application/json 或者text/event-stream（开启 SSE 响应）。 **Content-Type** `*string*` **（必选）** 请求内容类型。此参数必须设置为`application/json`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Authorization** `*string*`**（必选）** 请求身份认证。接口使用阿里云百炼API-Key进行身份认证。示例值：Bearer sk-xxxx。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| #### **请求体（Request Body）**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **model** `*string*`**（必选）** 模型名称。设置为[模型概览](#3ef850b9cfgvv)中的模型名称。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **input** `*object*` **（必选）** 输入内容。 **属性** contents `*array*`**（必选）** 待处理的内容列表。每个元素是一个字典或者字符串，用于指定内容的类型和值。格式为{"模态类型": "输入字符串或图像、视频url"}。支持`text`, `image`, `video`和`multi_images`四种模态类型。 > `qwen3-vl-embedding` 同时支持融合向量和独立向量生成。当把 text、image、video 放在同一个对象里时，生成融合向量；当把这三个分开作为独立的元素时，会针对每个单独生成向量。`qwen2.5-vl-embedding` 仅支持融合向量，不支持独立向量。 - 文本：key为`text`。value为字符串形式。也可不通过dict直接传入字符串。 - 图片：key为`image`。value可以是公开可访问的URL，或Base64编码的Data URI。Base64格式为 `data:image/{format};base64,{data}`，其中 `{format}` 是图片格式（如 `jpeg`, `png`），`{data}` 是Base64编码字符串。 - 多图片：仅`tongyi-embedding-vision-plus`与`tongyi-embedding-vision-flash`模型支持此类型。key为`multi_images`，value是多图序列列表，每条为一个图片，格式要求如上方所示，图片数量最多为8张。 - 视频：key为`video`，value必须是公开可访问的URL。 **parameters** `*object*` （可选） 向量处理参数。HTTP调用需包装在parameters对象中，SDK调用可直接使用以下参数。 **属性** **output\\\_type** `*string*` **可选** 用户指定输出向量表示格式，目前仅支持dense。 **dimension** `*integer*` **可选** 用于用户指定输出向量维度。不同模型支持的值不同： - `qwen3-vl-embedding` 支持 2560、2048、1536、1024、768、512、256，默认值为 2560； - `qwen2.5-vl-embedding` 支持 2048、1024、768、512，默认值为 1024； - `tongyi-embedding-vision-plus` 支持 64、128、256、512、1024、1152，默认值为 1152； - `tongyi-embedding-vision-flash` 支持 64、128、256、512、768，默认值为 768； - `multimodal-embedding-v1` 不支持此参数，固定返回 1024 维向量。 **fps** `*float*` **可选** 控制视频的帧数，比例越小，实际抽取的帧数越少，范围为 \\[0,1\\]。默认值为1.0。 **instruct** `*string*` **可选** 添加自定义任务说明，可用于指导模型理解查询意图。建议使用英文撰写，通常可带来约 1%–5% 的效果提升。 |

| ### **响应**                                                                                                                                                                                                                                                                                                                                                                | ## 成功响应 `{ "output": { "embeddings": [ { "index": 0, "embedding": [ -0.026611328125, -0.016571044921875, -0.02227783203125, ... ], "type": "text" }, { "index": 1, "embedding": [ 0.051544189453125, 0.007717132568359375, 0.026611328125, ... ], "type": "image" }, { "index": 2, "embedding": [ -0.0217437744140625, -0.016448974609375, 0.040679931640625, ... ], "type": "video" } ] }, "usage": { "input_tokens": 10, "image_tokens": 896 }, "request_id": "1fff9502-a6c5-9472-9ee1-73930fdd04c5" }` ## 异常响应 `{ "code":"InvalidApiKey", "message":"Invalid API-key provided.", "request_id":"fb53c4ec-1c12-4fc4-a580-cdb7c3261fc1" }` |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **output** `*object*` 任务输出信息。 **属性** **embeddings** `*array*` 向量结果列表，每个对象对应输入列表中的一个元素。 **属性** **index** `*int*` 结果在输入列表中的索引。 **embedding** `*array*` 生成的1024维向量。 **type** `*string*` 结果对应的输入类型 text/image/video/multi\\\_images/vl（仅当使用`qwen3-vl-embedding`或`qwen2.5-vl-embedding`模型时返回该类型）。 |
| **request\\\_id** `*string*` 请求唯一标识。可用于请求明细溯源和问题排查。                                                                                                                                                                                                                                                                                                   |
| **code** `*string*` 请求失败的错误码。请求成功时不会返回此参数，详情请参见[错误信息](https://help.aliyun.com/zh/model-studio/error-code)。                                                                                                                                                                                                                                  |
| **message** `*string*` 请求失败的详细信息。请求成功时不会返回此参数，详情请参见[错误信息](https://help.aliyun.com/zh/model-studio/error-code)。                                                                                                                                                                                                                             |
| **usage** `*object*` 输出信息统计。 **属性** **input\\\_tokens** `*int*` 本次请求输入内容的 Token 数目。 **image\\\_tokens** `*int*` 本次请求输入的图片或视频的Token数量。系统会对输入视频进行抽帧处理，帧数上限受系统配置控制，随后基于处理结果计算 Token。 **image\\\_count** `*int*` 本次请求输入的图片数量。 **duration** `*int*` 本次请求输入的视频时长（秒）。        |

## **SDK使用**

> 当前版本的 SDK 调用与原生 HTTP 调用的请求体结构**不一致**。SDK 的input参数对应了HTTP中的input.contents。

### **代码示例**

## **生成图片Embedding示例**

## 使用图片URL

```
import dashscope
import json
from http import HTTPStatus
# 实际使用中请将url地址替换为您的图片url地址
image = "https://dashscope.oss-cn-beijing.aliyuncs.com/images/256_1.png"
input = [{'image': image}]
# 调用模型接口
resp = dashscope.MultiModalEmbedding.call(
    model="tongyi-embedding-vision-plus",
    input=input
)

if resp.status_code == HTTPStatus.OK:
    result = {
        "status_code": resp.status_code,
        "request_id": getattr(resp, "request_id", ""),
        "code": getattr(resp, "code", ""),
        "message": getattr(resp, "message", ""),
        "output": resp.output,
        "usage": resp.usage
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))
```

## 使用本地图片

您可以参考以下示例代码，将本地图片转换为Base64格式后调用multimodal-embedding-v1模型进行向量化处理。

```
import dashscope
import base64
import json
from http import HTTPStatus
# 读取图片并转换为Base64,实际使用中请将xxx.png替换为您的图片文件名或路径
image_path = "xxx.png"
with open(image_path, "rb") as image_file:
    # 读取文件并转换为Base64
    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
# 设置图像格式
image_format = "png"  # 根据实际情况修改，比如jpg、bmp 等
image_data = f"data:image/{image_format};base64,{base64_image}"
# 输入数据
input = [{'image': image_data}]

# 调用模型接口
resp = dashscope.MultiModalEmbedding.call(
    model="tongyi-embedding-vision-plus",
    input=input
)
if resp.status_code == HTTPStatus.OK:
    result = {
        "status_code": resp.status_code,
        "request_id": getattr(resp, "request_id", ""),
        "code": getattr(resp, "code", ""),
        "message": getattr(resp, "message", ""),
        "output": resp.output,
        "usage": resp.usage
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))
```

## **生成视频Embedding示例**

> 多模态向量化模型目前仅支持以URL形式输入视频文件，暂不支持直接传入本地视频。

```
import dashscope
import json
from http import HTTPStatus
# 实际使用中请将url地址替换为您的视频url地址
video = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250107/lbcemt/new+video.mp4"
input = [{'video': video}]
# 调用模型接口
resp = dashscope.MultiModalEmbedding.call(
    model="tongyi-embedding-vision-plus",
    input=input
)

if resp.status_code == HTTPStatus.OK:
    result = {
        "status_code": resp.status_code,
        "request_id": getattr(resp, "request_id", ""),
        "code": getattr(resp, "code", ""),
        "message": getattr(resp, "message", ""),
        "output": resp.output,
        "usage": resp.usage
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))

```

## **生成文本Embedding示例**

```
import dashscope
import json
from http import HTTPStatus

text = "通用多模态表征模型示例"
input = [{'text': text}]
# 调用模型接口
resp = dashscope.MultiModalEmbedding.call(
    model="tongyi-embedding-vision-plus",
    input=input
)

if resp.status_code == HTTPStatus.OK:
    result = {
        "status_code": resp.status_code,
        "request_id": getattr(resp, "request_id", ""),
        "code": getattr(resp, "code", ""),
        "message": getattr(resp, "message", ""),
        "output": resp.output,
        "usage": resp.usage
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))
```

## 生成融合Embedding示例

```
import dashscope
import json
import os
from http import HTTPStatus

# 多模态融合向量：将文本、图片、视频融合成一个融合向量
# 适用于跨模态检索、图搜等场景
text = "这是一段测试文本，用于生成多模态融合向量"
image = "https://dashscope.oss-cn-beijing.aliyuncs.com/images/256_1.png"
video = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250107/lbcemt/new+video.mp4"

# 输入包含文本、图片、视频，模型会将它们融合成一个融合向量
input_data = [
    {
        "text": text,
        "image": image,
        "video": video
    }
]

# 使用 qwen3-vl-embedding 生成融合向量
resp = dashscope.MultiModalEmbedding.call(
    # 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx",
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    model="qwen3-vl-embedding",
    input=input_data,
    # 可选参数：指定向量维度（支持 2560、2048、1536、1024、768、512、256，默认 2560）
    # parameters={"dimension": 1024}
)

print(json.dumps(resp, ensure_ascii=False, indent=4))
```

### **输出示例**

JSON

```
{
    "status_code": 200,
    "request_id": "40532987-ba72-42aa-a178-bb58b52fb7f3",
    "code": "",
    "message": "",
    "output": {
        "embeddings": [
            {
                "index": 0,
                "embedding": [
                    -0.009490966796875,
                    -0.024871826171875,
                    -0.031280517578125,
                    ...
                ],
                "type": "text"
            }
        ]
    },
    "usage": {
        "input_tokens": 10,
        "input_tokens_details": {
            "image_tokens": 0,
            "text_tokens": 10
        },
        "output_tokens": 1,
        "total_tokens": 11
    }
}
```

## **错误码**

如果模型调用失败并返回报错信息，请参见[错误信息](https://help.aliyun.com/zh/model-studio/error-code)进行解决。
