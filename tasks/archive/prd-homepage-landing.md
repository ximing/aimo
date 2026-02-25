# PRD: AIMO 官网首页 redesign

## Introduction

重新设计 AIMO 官网首页（`/` 路径），作为项目的门面和下载入口。当前首页需要登录才能访问，新首页改为公开访问的 Landing Page，展示产品价值、提供多平台下载，并保留登录入口。

## Goals

- 打造现代简约的品牌形象，提升用户第一印象
- 提供清晰的多平台下载入口（桌面端 + Android APK）
- 展示 AIMO 核心功能特性，吸引潜在用户
- 支持明暗主题切换，适配不同用户偏好
- 保持响应式设计，适配移动端和桌面端
- 登录入口清晰可见，方便现有用户进入

## User Stories

### US-001: 创建公开访问的首页路由

**Description:** 作为访客，我希望无需登录即可访问首页，了解 AIMO 并下载应用。

**Acceptance Criteria:**

- [ ] 修改路由配置，`/` 路径无需登录即可访问
- [ ] 保留 `/home` 路径作为登录后的主应用入口
- [ ] 未登录用户访问 `/home` 时自动重定向到 `/`
- [ ] Typecheck/lint passes

### US-002: 实现固定导航栏

**Description:** 作为访客，我希望导航栏始终可见，方便快速跳转到不同区域或登录。

**Acceptance Criteria:**

- [ ] 导航栏固定在顶部，滚动时保持可见
- [ ] 包含 Logo、功能、下载、GitHub 链接、登录按钮
- [ ] 点击导航项平滑滚动到对应区域
- [ ] 移动端显示汉堡菜单
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: 设计 Hero 区域

**Description:** 作为访客，我希望一眼了解 AIMO 的核心价值，并被吸引继续浏览。

**Acceptance Criteria:**

- [ ] 展示产品名称 "AIMO" 和标语（如 "AI 驱动的知识管理"）
- [ ] 简短的副标题描述产品定位
- [ ] 两个主要 CTA 按钮："免费下载"（主按钮）和 "查看功能"（次按钮）
- [ ] 背景使用 subtle gradient 或抽象图形，不干扰内容
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: 实现功能特性展示区块

**Description:** 作为访客，我希望了解 AIMO 的核心功能，判断是否适合我的需求。

**Acceptance Criteria:**

- [ ] 展示 4-6 个核心功能卡片：AI 笔记、语义搜索、知识关联、多平台同步等
- [ ] 每个卡片包含图标、标题、简短描述
- [ ] 使用网格布局，桌面端 3 列，平板 2 列，移动端 1 列
- [ ] 卡片有 hover 效果（轻微上浮或阴影变化）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: 设计下载区域

**Description:** 作为访客，我希望方便地下载适合我设备的应用版本。

**Acceptance Criteria:**

- [ ] 桌面端区域：Mac、Windows、Linux 下载按钮并排展示
- [ ] 移动端区域：Android APK 下载按钮
- [ ] 显示当前版本号（从 GitHub API 获取最新 release 版本）
- [ ] 点击下载按钮直接下载对应平台的安装包
- [ ] 显示系统要求（如 macOS 12+、Windows 10+ 等）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: 实现应用截图展示

**Description:** 作为访客，我希望预览应用界面，了解实际使用体验。

**Acceptance Criteria:**

- [ ] 展示 3-5 张应用界面截图
- [ ] 支持轮播或网格展示
- [ ] 图片懒加载优化性能
- [ ] 点击可放大查看（可选 lightbox）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: 设计使用场景区块

**Description:** 作为访客，我希望了解 AIMO 在实际生活和工作中的应用场景。

**Acceptance Criteria:**

- [ ] 展示 2-3 个使用场景：个人知识库、学习笔记、灵感收集等
- [ ] 每个场景包含标题、描述、相关功能标签
- [ ] 使用左右交替布局（图文并排）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: 实现明暗主题切换

**Description:** 作为访客，我希望根据我的偏好或系统设置选择合适的主题。

**Acceptance Criteria:**

- [ ] 默认跟随系统主题设置
- [ ] 提供手动切换按钮（太阳/月亮图标）
- [ ] 主题偏好保存在 localStorage
- [ ] 切换时平滑过渡，无闪烁
- [ ] 所有组件正确适配暗色主题
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: 实现页脚区域

**Description:** 作为访客，我希望在页面底部找到更多资源和链接。

**Acceptance Criteria:**

- [ ] 包含 GitHub 仓库链接
- [ ] 包含登录入口
- [ ] 版权声明和许可证信息
- [ ] 可选：Twitter/X、Discord 等社交链接
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: GitHub Releases 版本获取

**Description:** 作为开发者，我需要自动获取最新版本号用于展示。

**Acceptance Criteria:**

- [ ] 创建 API 服务获取 GitHub Releases 最新版本
- [ ] 桌面端版本从 `ximing/aimo` 获取
- [ ] APK 版本从 `ximing/aimo-app` 获取
- [ ] 缓存版本信息，避免频繁请求
- [ ] 请求失败时显示默认版本或隐藏版本号
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: 首页（`/`）无需登录即可访问，移除当前的登录拦截
- FR-2: 导航栏固定在顶部，包含 Logo、功能、下载、GitHub、登录链接
- FR-3: Hero 区域展示产品名称、标语、两个 CTA 按钮
- FR-4: 功能特性区块展示 4-6 个核心功能，使用图标卡片形式
- FR-5: 下载区域分别展示桌面端（Mac/Windows/Linux）和移动端（APK）下载入口
- FR-6: 从 GitHub API 获取最新 release 版本号并展示
- FR-7: 应用截图区域展示界面预览，支持轮播或网格布局
- FR-8: 使用场景区块展示 2-3 个典型应用场景
- FR-9: 支持明暗主题切换，默认跟随系统，手动切换保存偏好
- FR-10: 页脚包含 GitHub 链接、登录入口、版权信息
- FR-11: 所有区域支持响应式布局，适配移动端和桌面端
- FR-12: 点击导航链接平滑滚动到对应区域

## Non-Goals

- 不实现用户注册功能（保持现有登录流程）
- 不实现应用内功能的交互演示（仅静态展示）
- 不实现多语言支持（仅中文）
- 不实现文档/帮助中心（链接到 GitHub README）
- 不实现邮件订阅功能
- 不实现实时聊天/客服功能

## Design Considerations

### 视觉风格

- **风格**: 现代简约，参考 Notion、Linear、Vercel 的设计语言
- **配色**: 简洁的黑白灰为主，辅以品牌色（如 indigo/blue）作为强调色
- **字体**: 使用系统字体栈，中文优先使用系统默认字体
- **圆角**: 适度的圆角（8-12px），营造友好感
- **阴影**: 轻微的阴影增加层次感，避免过重

### 布局参考

- **导航栏**: 固定顶部，玻璃态效果（glassmorphism），滚动时添加背景模糊
- **Hero**: 居中对齐，大标题 + 副标题 + 按钮组，下方可添加产品截图 mockup
- **功能卡片**: 3 列网格，图标 + 标题 + 描述，hover 时轻微上浮
- **下载区域**: 两栏布局，左侧桌面端、右侧移动端，或上下排列
- **截图展示**: 居中轮播，带指示器，或网格展示带点击放大
- **场景区块**: 左右交替布局，图文并排

### 交互细节

- 按钮 hover 状态：轻微缩放或颜色变化
- 卡片 hover 状态：上浮 4-8px + 阴影增强
- 页面滚动时导航栏添加背景色和阴影
- 主题切换按钮使用太阳/月亮图标
- 下载按钮显示对应平台图标（Apple、Windows、Linux、Android）

## Technical Considerations

### 路由调整

```typescript
// 当前：/ 需要登录，重定向到 /auth
// 新：/ 为公开首页，/home 为登录后的应用主页
const routes = [
  { path: '/', component: LandingPage, public: true },
  { path: '/home', component: HomePage, requireAuth: true },
  { path: '/auth', component: AuthPage },
];
```

### GitHub API 集成

```typescript
// 获取最新 release
const getLatestRelease = async (repo: string) => {
  const response = await fetch(`https://api.github.com/repos/ximing/${repo}/releases/latest`);
  const data = await response.json();
  return {
    version: data.tag_name,
    downloadUrl: data.assets[0].browser_download_url,
  };
};
```

### 主题切换实现

- 使用 Tailwind CSS 的 `dark:` 前缀
- 在 html 元素上添加/移除 `dark` class
- 使用 localStorage 存储用户偏好
- 使用 `matchMedia` 监听系统主题变化

### 依赖

- 可能需要的图标库：`lucide-react`（如果尚未使用）
- 轮播组件：可自研或使用轻量级库如 `embla-carousel`

### 性能考虑

- 图片懒加载
- GitHub API 响应缓存（可缓存 1 小时）
- 首屏关键 CSS 内联（可选优化）

## Success Metrics

- 首页加载时间 < 3 秒（3G 网络）
- Lighthouse 性能评分 > 90
- 支持从 320px 到 4K 的各种屏幕尺寸
- 主题切换无闪烁，过渡平滑
- 所有下载链接可正常访问

## Open Questions

1. 是否需要添加网站访问统计（如 Google Analytics）？
2. 是否需要添加 SEO meta 标签和 Open Graph 图片？
3. 是否需要支持国际化（i18n）？
4. 是否有现成的应用截图素材，还是需要先准备？
5. 品牌色是否有特定要求，还是使用默认 indigo/blue？
