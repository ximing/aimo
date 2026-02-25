# PRD: AIMO Chrome 浏览器扩展

## Introduction

AIMO Chrome 扩展是一个浏览器插件，让用户在浏览网页时可以快速提取和保存内容到 AIMO 知识管理系统。用户只需选中文本或图片，即可一键收藏为 memo，实现个人知识的高效积累。

## Goals

- 提供无缝的网页内容收集体验
- 支持文本和图片两种内容类型的提取
- 与 AIMO 后端深度集成，使用现有 JWT 认证体系
- 用户可在 3 步内完成内容收藏（选择 → 点击 → 确认）
- 扩展响应时间 < 500ms，不影响浏览体验

## User Stories

### US-001: 初始化扩展配置

**Description:** 作为用户，我首次使用扩展时需要配置 AIMO 服务器地址和登录信息，以便连接到我的知识库。

**Acceptance Criteria:**

- [ ] 扩展首次打开时显示配置页面
- [ ] 配置表单包含：服务器 URL、用户名、密码三个字段
- [ ] 点击登录按钮后调用 AIMO `/auth/login` API 获取 JWT token
- [ ] 登录成功后保存配置到 Chrome Storage (url + token)
- [ ] 登录失败显示错误提示（网络错误/认证失败）
- [ ] 配置页面可通过 popup 右上角的设置图标重新打开
- [ ] TypeScript 类型检查通过

### US-002: 浮动工具栏显示

**Description:** 作为用户，我在网页上选中文本或图片后，希望在选区附近快速看到操作按钮，无需打开 popup。

**Acceptance Criteria:**

- [ ] 在任意网页选中文本时，选区右下角显示浮动工具栏
- [ ] 工具栏包含 "保存到 AIMO" 按钮（图标 + 文字）
- [ ] 点击图片时显示相同的浮动工具栏
- [ ] 工具栏在点击页面其他区域或滚动时自动隐藏
- [ ] 工具栏样式与页面内容不冲突（使用 shadow DOM 隔离）
- [ ] 工具栏支持浅色/深色主题自适应
- [ ] TypeScript 类型检查通过
- [ ] 在浏览器中验证工具栏位置和交互

### US-003: 文本内容提取与预览

**Description:** 作为用户，我选中文本并点击保存后，希望在 popup 中预览和编辑内容后再提交。

**Acceptance Criteria:**

- [ ] 点击浮动工具栏的保存按钮后，自动打开 popup 弹窗
- [ ] Popup 显示选中内容的预览区域
- [ ] 显示内容来源 URL 和页面标题（自动填充，不可编辑）
- [ ] 提供内容编辑区域（多行文本框），可修改文本内容
- [ ] 显示 "保存到 AIMO" 和 "取消" 两个按钮
- [ ] 点击保存调用 AIMO API 创建 memo
- [ ] 保存成功后显示成功提示，2秒后自动关闭 popup
- [ ] TypeScript 类型检查通过
- [ ] 在浏览器中验证文本提取和预览流程

### US-004: 图片下载与上传

**Description:** 作为用户，我选中图片后，希望图片被下载并上传到 AIMO 服务器，与 memo 关联。

**Acceptance Criteria:**

- [ ] 获取选中图片的 URL（支持 `<img>` 标签和背景图）
- [ ] 使用 Chrome 下载 API 将图片下载到临时 Blob
- [ ] 将图片转换为 File 对象，调用 AIMO `/attachments` API 上传
- [ ] 上传成功后获取 attachment ID
- [ ] 创建 memo 时将 attachment ID 关联到 memo
- [ ] Popup 中显示图片预览（缩略图）
- [ ] 上传失败时显示错误提示，允许重试
- [ ] TypeScript 类型检查通过
- [ ] 在浏览器中验证图片下载和上传流程

### US-005: Popup 内容管理

**Description:** 作为用户，我希望在 popup 中查看本次浏览会话中已提取的所有内容，支持批量或单独管理。

**Acceptance Criteria:**

- [ ] Popup 主界面显示 "待保存内容" 列表
- [ ] 每条内容显示：类型图标（文本/图片）、内容摘要、来源页面
- [ ] 支持单条删除（从列表移除，不保存）
- [ ] 支持编辑单条内容（文本可编辑，图片可替换）
- [ ] 提供 "全部保存" 按钮，批量提交所有内容
- [ ] 空列表时显示提示文案和快捷操作指引
- [ ] TypeScript 类型检查通过
- [ ] 在浏览器中验证列表管理和批量操作

### US-006: 扩展状态与错误处理

**Description:** 作为用户，我希望在扩展遇到问题时得到清晰的反馈，比如未登录或网络错误。

**Acceptance Criteria:**

- [ ] 未配置服务器时，点击工具栏按钮显示 "请先配置服务器"
- [ ] Token 过期时自动跳转到登录页面
- [ ] 网络请求失败时显示具体错误信息
- [ ] 提供 "重试" 按钮用于失败的请求
- [ ] 扩展图标上显示未保存内容数量徽章（红色数字）
- [ ] TypeScript 类型检查通过
- [ ] 在浏览器中验证各种错误场景的处理

## Functional Requirements

- FR-1: 扩展使用 Manifest V3 格式，支持 Chrome 88+
- FR-2: 配置存储使用 `chrome.storage.local`，包含 `serverUrl` 和 `token` 字段
- FR-3: 文本选择监听通过 `document.onselectionchange` 实现
- FR-4: 图片点击监听通过 `document.addEventListener('click')` 实现，仅响应图片元素
- FR-5: 浮动工具栏使用原生 DOM 创建，插入到页面 body 末尾
- FR-6: 内容提取后存储在 `chrome.storage.session` 的 `pendingItems` 数组中
- FR-7: 调用 AIMO API 时使用存储的 token 添加 `Authorization: Bearer` 请求头
- FR-8: 文本 memo 创建调用 `POST /memos`，包含 `content` 和 `sourceUrl` 字段
- FR-9: 图片上传调用 `POST /attachments` (multipart/form-data)，创建 memo 时关联 `attachmentIds`
- FR-10: Popup 打开时从 session storage 读取并显示待保存内容列表

## Non-Goals

- 不支持富文本格式保留（仅纯文本）
- 不支持批量选择多个图片
- 不支持网页整页保存（仅选中内容）
- 不支持离线模式（必须联网使用）
- 不支持标签/分类选择（使用 AIMO 后端默认逻辑）
- 不支持多语言国际化（仅中文界面）

## Design Considerations

### UI 风格

- 简洁现代，与 AIMO Web 界面保持一致
- 主色调使用 AIMO 品牌色（待定，建议蓝色系）
- 圆角设计，轻微阴影，符合现代浏览器扩展审美

### 浮动工具栏

- 位置：选区右下角或图片右下角，距边缘 8px
- 尺寸：高度 32px，宽度自适应
- 动画：淡入 150ms，淡出 100ms
- 内容：AIMO 图标 + "保存" 文字

### Popup 布局

- 宽度：400px，高度：自适应（最大 600px）
- 头部：扩展标题 + 设置图标
- 主体：待保存内容列表/配置表单
- 底部：操作按钮（保存/取消）

## Technical Considerations

### 项目结构

```
apps/extension/
├── manifest.json          # 扩展配置
├── src/
│   ├── background/        # Service Worker
│   │   └── index.ts       # 后台脚本，处理 API 调用
│   ├── content/           # 内容脚本
│   │   └── index.ts       # 页面注入，处理选择和工具栏
│   ├── popup/             # 弹窗页面
│   │   ├── index.html
│   │   ├── index.tsx      # Popup 入口
│   │   ├── App.tsx        # 主组件
│   │   └── components/    # 子组件
│   ├── storage/           # 存储管理
│   │   └── index.ts       # Chrome Storage 封装
│   ├── api/               # API 客户端
│   │   └── aimo.ts        # AIMO API 封装
│   └── types/             # TypeScript 类型
│       └── index.ts
├── package.json
└── tsconfig.json
```

### 权限需求

- `storage` - 存储配置和待保存内容
- `activeTab` - 访问当前页面内容
- `host_permissions` - 访问 AIMO 服务器域名

### 关键依赖

- TypeScript 5.x
- React 18（用于 Popup UI）
- Vite（构建工具）
- Chrome Extension API 类型定义

### 安全性

- Token 仅存储在 local storage，不发送给第三方
- 内容脚本使用 shadow DOM 隔离样式
- API 请求使用 HTTPS 强制加密

## Success Metrics

- 用户从选中内容到保存成功平均耗时 < 10 秒
- 扩展安装后 7 日留存率 > 60%
- 平均每个用户每日创建 memo 数量 > 3
- 错误率（保存失败/崩溃）< 1%

## Open Questions

1. 是否需要支持快捷键触发（如 Cmd+Shift+S）？
2. 是否需要右键菜单作为备选操作方式？
3. 是否需要支持选择区域截图（而非仅图片元素）？
4. AIMO 后端是否需要新增 API 支持（如批量创建 memo）？
5. 是否需要支持选择内容后自动生成 AI 摘要？
