import fs from 'fs/promises';

interface MemoItem {
  content: string;
  created_ts: number;
  creator_id: number;
  id: number;
  payload: string;
  row_status: string;
  tags: string;
  uid: string;
  updated_ts: number;
  visibility: string;
}

interface ResourceItem {
  id: number;
  memo_id: number;
  filename: string;
  type: string;
  size: number;
  reference: string;
  created_ts: number;
  updated_ts: number;
}

interface ConvertedNote {
  content: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }>;
}

async function convertMemoToNotes(
  memoPath: string,
  resourcePath: string,
  outputPath: string
) {
  try {
    // 读取输入文件
    const memoData = await fs.readFile(memoPath, 'utf-8');
    const resourceData = await fs.readFile(resourcePath, 'utf-8');

    const memos: MemoItem[] = JSON.parse(memoData);
    const resources: ResourceItem[] = JSON.parse(resourceData);

    // 创建资源映射
    const resourceMap = new Map<number, ResourceItem[]>();
    resources.forEach((resource) => {
      if (!resourceMap.has(resource.memo_id)) {
        resourceMap.set(resource.memo_id, []);
      }
      resourceMap.get(resource.memo_id)?.push(resource);
    });

    // 转换数据
    const notes: ConvertedNote[] = memos.map((memo) => {
      // 解析 payload 中的标签
      let payloadTags: string[] = [];
      try {
        const payload = JSON.parse(memo.payload);
        payloadTags = payload.property?.tags || [];
      } catch (e) {
        console.warn(`Failed to parse payload for memo ${memo.id}`);
      }

      // 获取关联的资源
      const memoResources = resourceMap.get(memo.id) || [];
      const attachments = memoResources.map((resource) => ({
        url: resource.reference,
        filename: resource.filename,
        size: resource.size || 0,
        mimeType: resource.type,
      }));

      return {
        content: memo.content,
        tags: payloadTags,
        isPublic: memo.visibility === 'PUBLIC',
        createdAt: new Date(memo.created_ts * 1000).toISOString(),
        updatedAt: new Date(memo.updated_ts * 1000).toISOString(),
        attachments,
      };
    });

    // 写入输出文件
    await fs.writeFile(outputPath, JSON.stringify(notes, null, 2));
    console.log(`✅ Successfully converted ${notes.length} notes`);
    console.log(`Found ${resources.length} resources`);
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}
console.log(process.argv, import.meta.url);
// 如果直接运行脚本
if (import.meta.url.includes(process.argv[1])) {
  const memoPath = process.argv[2] || './memo.json';
  const resourcePath = process.argv[3] || './resource.json';
  const outputPath = process.argv[4] || './converted-notes.json';
  console.log(memoPath, resourcePath, outputPath);
  convertMemoToNotes(memoPath, resourcePath, outputPath).catch(console.error);
}

export { convertMemoToNotes };

// pnpm tsx apps/server/scripts/convert-memo.ts -- /Users/ximing/Downloads/memo.json /Users/ximing/Downloads/resource.json /Users/ximing/Downloads/output.json
