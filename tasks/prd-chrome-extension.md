# PRD: AIMO Chrome 插件

## Introduction

在 apps/extension 目录下实现一个 Chrome 浏览器插件，让用户可以快速保存网页中选中的文字和图片到 AIMO 笔记系统。该插件支持用户登录、浮层按钮保存、分类选择和来源 URL 自动记录功能。

## Goals

- 实现 Chrome 插件基础框架，支持现有 AIMO 账号登录
- 在浏览器中选中文字或图片时显示浮层按钮，点击保存到 AIMO
- 图片需要先下载到本地，再作为附件上传到 AIMO
- 在设置页面中支持选择默认保存的分类
- 支持设置是否保存来源 URL，保存时自动记录当前页面 URL
- 后端 Memo 数据结构增加 source 字段存储来源 URL
- 前端页面展示来源 URL 图标，点击可跳转到对应页面

## User Stories

### US-001: 实现 Chrome 插件基础结构
**Description:** 作为开发者，我需要建立 Chrome 插件的基础目录结构和配置文件，以便后续功能开发。

**Acceptance Criteria:**
- [ ] manifest.json 配置正确，包含 popup、background、content_scripts 权限
- [ ] Vite 构建配置支持 Chrome 插件开发
- [ ] 项目结构清晰，分为 popup、background、content、types 等模块
- [ ] Typecheck 通过
- [ ] 可以成功构建插件包

### US-002: 用户登录功能
**Description:** 作为 AIMO 用户，我想要通过插件登录我的 AIMO 账号，以便保存内容到我的笔记。

**Acceptance Criteria:**
- [ ] 登录页面包含 AIMO 服务器地址输入框
- [ ] 登录页面包含邮箱/用户名和密码输入框
- [ ] 调用后端 `/api/v1/auth/login` 接口进行登录
- [ ] 登录成功后保存 token 到 chrome.storage
- [ ] 登录状态持久化，刷新插件页面保持登录
- [ ] 登录失败显示错误提示
- [ ] 支持退出登录功能
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-002-B: 用户登录 - 使用 Token 直接登录
**Description:** 作为已有 API Token 的用户，我想通过直接输入 Token 登录插件。

**Acceptance Criteria:**
- [ ] 登录页面提供 Token 登录选项
- [ ] 输入 Token 后直接验证可用性
- [ ] Token 验证成功保存到 chrome.storage
- [ ] Typecheck 通过

### US-003: 选中文字显示浮层按钮
**Description:** 作为用户，我在浏览器中选中一段文字后，希望看到浮层按钮来快速保存。

**Acceptance Criteria:**
- [ ] 用户在网页中选中文字时，自动在选区附近显示浮层按钮
- [ ] 浮层按钮显示「保存到 AIMO」或类似文案
- [ ] 按钮样式在深色/浅色页面都有良好可见性
- [ ] 用户未登录时，点击按钮显示登录提示
- [ ] 用户已登录时，点击按钮保存内容
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-004: 选中图片显示浮层按钮
**Description:** 作为用户，我在浏览器中右键或悬停图片时，希望看到浮层按钮来保存图片。

**Acceptance Criteria:**
- [ ] 用户悬停图片时，显示浮层按钮
- [ ] 按钮显示「保存图片到 AIMO」或类似文案
- [ ] 点击按钮后开始下载图片
- [ ] 图片下载完成后上传到 AIMO 作为附件
- [ ] 创建新 memo，附件关联到该 memo
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-005: 保存内容到 AIMO
**Description:** 作为用户，我点击浮层按钮后，希望内容被保存到 AIMO 并创建新 memo。

**Acceptance Criteria:**
- [ ] 文字内容直接创建为 text 类型 memo
- [ ] 图片内容先下载到本地临时存储，再上传到 AIMO 附件接口
- [ ] 上传完成后创建 memo 并关联附件
- [ ] 保存成功显示确认提示
- [ ] 保存失败显示错误提示，包含重试选项
- [ ] Typecheck 通过

### US-006: 插件设置页面 - 分类设置
**Description:** 作为用户，我想在插件设置中指定保存 memo 的默认分类。

**Acceptance Criteria:**
- [ ] 设置页面包含「默认分类」选项
- [ ] 调用后端 API 获取用户已有分类列表
- [ ] 以下拉列表展示分类供用户选择
- [ ] 可以不选择分类（默认为空/无分类）
- [ ] 设置保存到 chrome.storage
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-007: 插件设置页面 - 来源设置
**Description:** 作为用户，我想设置是否保存来源 URL。

**Acceptance Criteria:**
- [ ] 设置页面包含「保存来源 URL」开关
- [ ] 开关默认为开启状态
- [ ] 开启时，创建 memo 时自动记录当前页面 URL
- [ ] 关闭时，不记录来源 URL
- [ ] 设置保存到 chrome.storage
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-008: 后端 Memo 增加 source 字段
**Description:** 作为开发者，我需要在 Memo 数据结构中增加 source 字段来存储来源 URL。

**Acceptance Criteria:**
- [ ] 在 packages/dto 的 Memo 相关类型中增加 `source?: string` 字段
- [ ] 在 LanceDB 的 memo 表中增加 source 字段
- [ ] 创建数据库迁移添加 source 列
- [ ] 创建/更新 memo 接口支持 source 字段
- [ ] Typecheck 通过
- [ ] 后端测试通过

### US-009: 前端展示来源 URL
**Description:** 作为用户，我想在笔记列表中看到每条 memo 的来源 URL，点击可以跳转。

**Acceptance Criteria:**
- [ ] 在 memo 卡片上显示来源 URL 图标（当 source 有值时）
- [ ] 当 memo 有 source 字段时显示图标
- [ ] 点击图标打开 source URL（在新标签页）
- [ ] 图标在深色/浅色主题下都有良好可见性
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

### 插件功能 (FR)

- FR-1: Chrome 插件使用现有 AIMO 账号体系登录（邮箱+密码 或 Token）
- FR-2: 登录信息保存在 chrome.storage，插件重启后保持登录状态
- FR-3: 用户选中网页文字时，在选区附近显示浮层按钮
- FR-4: 用户悬停图片时，显示「保存图片」浮层按钮
- FR-5: 点击保存文字时，直接调用 API 创建 text 类型 memo
- FR-6: 点击保存图片时，先用 fetch 下载图片 blob，再上传到 AIMO 附件接口，最后创建关联附件的 memo
- FR-7: 浮层按钮检测用户登录状态，未登录显示提示或跳转登录
- FR-8: 插件设置页面可配置默认保存分类（调用后端 API 获取分类列表）
- FR-9: 插件设置页面可配置是否保存来源 URL
- FR-10: 保存来源时，自动获取当前页面 URL 并附加到 memo

### 后端功能 (FR)

- FR-11: Memo DTO 增加 `source?: string` 字段
- FR-12: LanceDB memo 表增加 source 列
- FR-13: 创建/更新 memo API 支持 source 字段
- FR-14: 获取 memo 列表时返回 source 字段

### 前端功能 (FR)

- FR-15: Memo 卡片显示来源 URL 图标（当 source 有值时）
- FR-16: 点击来源图标在新标签页打开 URL

## Non-Goals

- 不实现浏览器同步插件设置到 AIMO 服务器（设置仅保存在 chrome.storage）
- 不实现剪贴板监控功能
- 不支持保存视频（仅支持文字和图片）
- 不实现插件自动更新功能
- 不实现多语言界面
- 不支持在移动端浏览器使用

## Technical Considerations

### Chrome 插件架构

- popup: 登录和设置页面
- background: 处理长连接、API 请求中转
- content: 页面内容脚本，处理选中文本/图片和浮层按钮

### 存储方案

- 登录信息（token）: chrome.storage.session（关闭浏览器后清除）
- 插件设置（分类、来源开关）: chrome.storage.local（持久化）

### 图片处理流程

1. 用户点击保存图片按钮
2. content script 发送消息到 background
3. background 用 fetch 下载图片 blob
4. background 调用附件上传 API
5. 获取 attachmentId 后，background 调用创建 memo API
6. 发送消息回 content script 显示成功/失败

### 浮层按钮实现

- 使用 CSS fixed 定位
- 监听 mouseup 事件检测文本选择
- 使用 IntersectionObserver 或 mouseenter 检测图片悬停
- 浮层位置计算：文本选择使用 getBoundingClientRect()，图片使用鼠标位置

### 分类 API

需要确认后端是否有分类相关 API，如果没有需要新增：
- GET /api/v1/categories - 获取用户分类列表

### 来源 URL 处理

- 获取方式：window.location.href（在 content script 中获取）
- 保存格式：memo.source 字段存储完整 URL

## Design Considerations

### 浮层按钮样式

- 简洁的圆形或圆角矩形按钮
- 使用 AIMO 品牌色（参考现有前端主题）
- 半透明背景，确保在各种页面背景上可见
- 位置：文本选择时在选区右上角，图片悬停时跟随鼠标

### 设置页面布局

- 使用现有 AIMO 前端的 UI 组件风格（Tailwind CSS）
- 简洁的表单布局
- 清晰的开关和下拉选择

### 来源图标

- 使用链接/外部链接图标
- 放置在 memo 卡片的时间/日期旁边
- tooltip 显示完整 URL

## Success Metrics

- 用户可以在 30 秒内完成登录流程
- 从选中内容到点击保存按钮，响应时间 < 200ms
- 图片保存流程（下载+上传+创建 memo）< 5 秒
- 插件包大小 < 500KB

## Open Questions

- 是否需要支持保存选中的 HTML 内容（带格式）？
- 分类 API 是否已经存在？需要确认接口路径和返回格式
- source 字段在前端的其他展示位置（详情页、编辑页等）
- 是否需要记录来源页面的标题（sourceTitle）？
- 附件上传接口是否支持大文件？是否需要分片上传？
