# 草稿自动保存功能使用示例

## 示例 1：创建新笔记时的草稿保存

### 用户操作流程

1. **打开应用并开始创建笔记**

   ```
   用户在编辑器中输入：
   "今天学习了 React 19 的新特性..."
   ```

2. **系统自动保存草稿**
   - 用户输入后 1 秒，系统自动将内容保存到 localStorage
   - localStorage key: `memo_draft_create`
   - 保存的数据包括：内容、类别、标签、附件等

3. **意外刷新页面**
   - 用户按了 F5 或点击了刷新按钮
   - 页面重新加载

4. **系统检测并恢复草稿**

   ```
   弹窗提示：
   "检测到未保存的草稿，是否恢复？

   点击"确定"恢复草稿，点击"取消"丢弃草稿。"
   ```

5. **用户选择恢复**
   - 点击"确定"
   - 之前输入的所有内容都恢复了
   - 显示提示：✅ 草稿已恢复

6. **完成编辑并保存**
   - 用户继续编辑完成
   - 点击保存按钮
   - 系统自动清除草稿

## 示例 2：编辑笔记时的草稿保存

### 用户操作流程

1. **打开一个已有笔记进行编辑**

   ```
   原始内容：
   "React 基础知识"

   编辑后：
   "React 基础知识

   1. 组件化开发
   2. 虚拟 DOM
   3. 单向数据流
   ..."
   ```

2. **系统自动保存草稿**
   - localStorage key: `memo_draft_edit_abc123` (abc123 是 memoId)
   - 保存修改后的完整内容

3. **浏览器意外崩溃**
   - 用户正在编辑时，浏览器崩溃或电脑死机

4. **重新打开并编辑**
   - 用户重新打开浏览器
   - 导航到该笔记的编辑页面
   - 系统检测到草稿并提示恢复

5. **恢复并继续编辑**
   - 用户确认恢复
   - 所有修改都还在
   - 继续完成编辑

## 示例 3：选择不恢复草稿

### 用户操作流程

1. **开始创建笔记**

   ```
   输入了一些测试内容：
   "test test test"
   ```

2. **刷新页面**
   - 用户意识到输入的是测试内容，想重新开始

3. **拒绝恢复草稿**

   ```
   弹窗提示：
   "检测到未保存的草稿，是否恢复？"

   用户点击"取消"
   ```

4. **草稿被清除**
   - 编辑器显示为空白状态
   - 草稿从 localStorage 中删除
   - 用户可以重新开始创建

## 示例 4：草稿自动过期

### 场景

1. **7 天前创建了草稿**

   ```
   用户在 2026-02-24 创建了一个草稿但没有保存
   ```

2. **今天打开应用**

   ```
   当前日期：2026-03-03
   应用启动时自动清理过期草稿
   ```

3. **草稿已被清除**
   - 系统检测到草稿超过 7 天
   - 自动删除过期草稿
   - 用户不会看到恢复提示

## localStorage 数据结构示例

### 创建模式草稿

```json
{
  "key": "memo_draft_create",
  "value": {
    "content": "今天学习了 React 19 的新特性...",
    "categoryId": "cat_123",
    "isPublic": false,
    "tags": ["React", "学习笔记"],
    "attachments": [
      {
        "attachmentId": "att_456",
        "url": "https://example.com/image.png",
        "type": "image/png",
        "name": "screenshot.png"
      }
    ],
    "relations": [
      {
        "memoId": "memo_789",
        "content": "React 基础知识",
        "createdAt": "2026-03-01T10:00:00Z"
      }
    ],
    "timestamp": 1709452800000
  }
}
```

### 编辑模式草稿

```json
{
  "key": "memo_draft_edit_abc123",
  "value": {
    "content": "更新后的笔记内容...",
    "categoryId": "cat_456",
    "isPublic": true,
    "tags": ["更新", "编辑"],
    "attachments": [],
    "relations": [],
    "timestamp": 1709452900000
  }
}
```

## 开发者调试

### 查看当前草稿

```javascript
// 在浏览器控制台执行
localStorage.getItem('memo_draft_create');
localStorage.getItem('memo_draft_edit_abc123');
```

### 手动清除草稿

```javascript
// 清除创建模式草稿
localStorage.removeItem('memo_draft_create');

// 清除特定笔记的编辑草稿
localStorage.removeItem('memo_draft_edit_abc123');

// 清除所有草稿
Object.keys(localStorage)
  .filter((key) => key.startsWith('memo_draft_'))
  .forEach((key) => localStorage.removeItem(key));
```

### 模拟过期草稿

```javascript
// 创建一个 8 天前的草稿
const oldDraft = {
  content: '旧草稿',
  categoryId: null,
  isPublic: false,
  tags: [],
  attachments: [],
  relations: [],
  timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 天前
};
localStorage.setItem('memo_draft_create', JSON.stringify(oldDraft));

// 刷新页面，系统会自动清除这个过期草稿
```
