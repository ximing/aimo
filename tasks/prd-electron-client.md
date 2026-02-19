# PRD: Electron 桌面客户端

## Introduction

为 AIMO 创建 Electron 桌面客户端，提供原生桌面体验。客户端使用 Vite 构建，位于 `apps/client`，复用现有的 `apps/web` 作为渲染层。通过 IPC 层实现浏览器端和 Electron 端的能力差异，让用户在桌面端享受系统级快捷键、系统托盘、本地文件拖拽等原生功能。

## Goals

- 创建基于 Vite 的 Electron 项目结构，位于 `apps/client`
- 复用 `apps/web` 作为渲染层，通过环境检测切换不同实现
- 实现原生桌面功能：系统托盘、快捷键、原生菜单、文件拖拽
- 支持跨平台打包（macOS/Windows/Linux）
- 保持 Web 和 Electron 双端代码共用，减少维护成本

## User Stories

### US-001: 初始化 Electron 项目结构
**Description:** 作为开发者，我需要创建 Electron 项目的基础结构，以便开始开发桌面客户端。

**Acceptance Criteria:**
- [ ] 在 `apps/client` 创建 Electron 项目，使用 Vite + Electron 模板
- [ ] 配置主进程（main）和渲染进程（renderer）的构建流程
- [ ] 配置 TypeScript 支持
- [ ] 添加 `pnpm dev:client` 命令启动 Electron 开发模式
- [ ] 添加 `pnpm build:client` 命令打包 Electron 应用
- [ ] Typecheck/lint passes

### US-002: 复用 Web 项目作为渲染层
**Description:** 作为开发者，我希望 Electron 加载现有的 Web 项目，避免代码重复。

**Acceptance Criteria:**
- [ ] Electron 主进程开发模式下加载 `apps/web` 的 Vite dev server
- [ ] Electron 主进程生产模式下加载打包后的 Web 静态文件
- [ ] 配置 `apps/web` 的构建输出目录供 Electron 使用
- [ ] 验证 Electron 窗口正确显示 Web 界面
- [ ] Typecheck/lint passes

### US-003: 实现运行环境检测
**Description:** 作为用户，我希望 Web 应用能识别是否在 Electron 中运行，以便调用不同的功能。

**Acceptance Criteria:**
- [ ] 创建 `isElectron()` 工具函数检测运行环境
- [ ] 在渲染进程中暴露 `window.electronAPI` 供前端调用
- [ ] Web 端代码可以通过类型安全的方式访问 Electron API
- [ ] 浏览器端运行时 `window.electronAPI` 为 undefined，不报错
- [ ] Typecheck/lint passes
- [ ] 在 Electron 和浏览器中分别验证环境检测正确

### US-004: 实现系统托盘功能
**Description:** 作为用户，我希望关闭窗口后应用仍在后台运行，可以从系统托盘快速打开。

**Acceptance Criteria:**
- [ ] 点击关闭按钮时窗口隐藏到系统托盘（而非退出应用）
- [ ] 系统托盘显示 AIMO 图标
- [ ] 托盘菜单包含：显示主窗口、退出应用
- [ ] 点击托盘图标显示/隐藏主窗口
- [ ] macOS 上支持 Dock 图标点击恢复窗口
- [ ] Typecheck/lint passes
- [ ] 手动验证托盘功能在各平台正常工作

### US-005: 实现系统级快捷键
**Description:** 作为用户，我希望使用全局快捷键快速打开/隐藏 AIMO 窗口，提高效率。

**Acceptance Criteria:**
- [ ] 注册全局快捷键（如 `Cmd/Ctrl+Shift+A`）显示/隐藏主窗口
- [ ] 快捷键在应用后台运行时依然有效
- [ ] 快捷键可配置（至少在代码层面）
- [ ] 应用退出时正确注销快捷键
- [ ] Typecheck/lint passes
- [ ] 手动验证快捷键在各平台正常工作

### US-006: 实现原生应用菜单
**Description:** 作为用户，我希望使用原生菜单栏执行常用操作。

**Acceptance Criteria:**
- [ ] macOS 上显示原生菜单栏（应用菜单、编辑菜单、视图菜单、窗口菜单）
- [ ] Windows/Linux 上显示相应菜单栏
- [ ] 菜单包含标准功能：复制/粘贴/剪切、全选、撤销/重做
- [ ] 菜单包含应用功能：新建笔记、搜索、设置
- [ ] 菜单包含视图功能：刷新、切换开发者工具、实际大小/放大/缩小
- [ ] Typecheck/lint passes
- [ ] 手动验证菜单在各平台正常显示和工作

### US-007: 实现本地文件拖拽支持
**Description:** 作为用户，我希望直接从桌面拖拽文件到 AIMO 窗口中添加附件。

**Acceptance Criteria:**
- [ ] 支持从系统文件管理器拖拽文件到 Electron 窗口
- [ ] 拖拽时显示视觉反馈（如高亮拖放区域）
- [ ] 拖拽文件后触发上传/添加附件流程
- [ ] 支持多文件同时拖拽
- [ ] 处理拖拽文件夹的情况（可提示暂不支持或只取文件）
- [ ] Typecheck/lint passes
- [ ] 手动验证文件拖拽功能正常工作

### US-008: 实现窗口状态管理
**Description:** 作为用户，我希望应用记住窗口位置和大小，下次打开时保持一致。

**Acceptance Criteria:**
- [ ] 窗口关闭前保存位置、大小、最大化状态到本地配置
- [ ] 应用启动时恢复上次窗口状态
- [ ] 使用 electron-store 或类似库管理配置
- [ ] 配置存储在用户数据目录，不污染安装目录
- [ ] Typecheck/lint passes
- [ ] 手动验证窗口状态正确保存和恢复

### US-009: 实现自动更新机制
**Description:** 作为用户，我希望应用自动检查更新并提示安装。

**Acceptance Criteria:**
- [ ] 集成 electron-updater 实现自动更新
- [ ] 应用启动时检查更新
- [ ] 发现更新时显示提示通知
- [ ] 支持手动触发更新检查（菜单项）
- [ ] 配置更新服务器地址（可先使用 GitHub Releases）
- [ ] Typecheck/lint passes
- [ ] 手动验证更新检查流程（可使用测试版本）

### US-010: 配置跨平台打包
**Description:** 作为开发者，我需要打包应用供 macOS、Windows 和 Linux 用户使用。

**Acceptance Criteria:**
- [ ] 配置 electron-builder 进行应用打包
- [ ] 支持打包 macOS 版本（.dmg, .zip）
- [ ] 支持打包 Windows 版本（.exe, .msi）
- [ ] 支持打包 Linux 版本（.AppImage, .deb, .rpm）
- [ ] 配置应用图标（各平台格式：icns, ico, png）
- [ ] CI/CD 配置自动生成各平台安装包
- [ ] Typecheck/lint passes
- [ ] 手动验证各平台安装包可正常安装和运行

## Functional Requirements

- FR-1: 项目结构
  - FR-1.1: `apps/client` 包含主进程代码（main）和预加载脚本（preload）
  - FR-1.2: `apps/client` 复用 `apps/web` 作为渲染层
  - FR-1.3: 使用 Vite 构建 Electron 主进程和预加载脚本

- FR-2: 环境检测与 IPC
  - FR-2.1: 提供 `isElectron()` 函数检测运行环境
  - FR-2.2: 预加载脚本通过 `contextBridge` 安全暴露 API 到渲染进程
  - FR-2.3: IPC 通道命名规范：`electron:channel-name`

- FR-3: 系统托盘
  - FR-3.1: 关闭窗口时隐藏到托盘（`event.preventDefault()` + `hide()`）
  - FR-3.2: 托盘图标支持明暗主题适配
  - FR-3.3: 右键菜单支持显示/隐藏和退出

- FR-4: 全局快捷键
  - FR-4.1: 默认快捷键 `CommandOrControl+Shift+A`
  - FR-4.2: 快捷键切换窗口显示/隐藏状态
  - FR-4.3: 应用失焦时快捷键依然有效

- FR-5: 原生菜单
  - FR-5.1: macOS 使用 `Menu.buildFromTemplate()` 创建应用菜单
  - FR-5.2: Windows/Linux 相应菜单适配
  - FR-5.3: 菜单快捷键与 Web 应用快捷键不冲突

- FR-6: 文件拖拽
  - FR-6.1: 监听 `drag-over` 和 `drop` 事件
  - FR-6.2: 通过 IPC 将文件路径传递给渲染进程
  - FR-6.3: 渲染进程调用现有附件上传 API

- FR-7: 窗口状态
  - FR-7.1: 使用 electron-store 存储窗口配置
  - FR-7.2: 配置键：`windowBounds`, `isMaximized`
  - FR-7.3: 多显示器环境下正确处理显示器变化

- FR-8: 自动更新
  - FR-8.1: 集成 electron-updater
  - FR-8.2: 更新服务器可配置
  - FR-8.3: 支持静默检查和手动触发

- FR-9: 打包分发
  - FR-9.1: electron-builder 配置支持多平台
  - FR-9.2: 代码签名配置（macOS 公证、Windows 证书）
  - FR-9.3: 生成最新版本文件（latest-mac.yml, latest.yml 等）

## Non-Goals

- 不内置后端服务（保持连接远程 API）
- 不支持离线模式（需要网络连接）
- 不实现 Electron 专属的新功能，只做现有 Web 功能的增强
- 不做深度系统集成（如 Spotlight/Alfred 集成、系统扩展等）
- 不实现多窗口支持（保持单窗口应用）

## Design Considerations

- UI/UX 保持与 Web 端完全一致，不做桌面专属 UI 改造
- 系统托盘图标使用简洁的单色设计，适配 macOS 菜单栏风格
- 文件拖拽的视觉反馈使用 Web 端已有的拖放组件样式

## Technical Considerations

### 依赖管理
- Electron 版本：使用最新稳定版（v30+）
- 构建工具：Vite + vite-plugin-electron
- 打包工具：electron-builder

### IPC 通信规范
```typescript
// 预加载脚本暴露的 API 结构
interface ElectronAPI {
  // 平台信息
  platform: 'darwin' | 'win32' | 'linux';

  // 文件拖拽
  onFileDrop: (callback: (files: string[]) => void) => void;

  // 窗口控制
  minimize: () => void;
  maximize: () => void;
  close: () => void;

  // 自动更新
  checkForUpdates: () => Promise<UpdateInfo>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
}
```

### Web 端适配
- 在 `apps/web` 创建 `src/electron/` 目录存放 Electron 适配代码
- 使用条件导入：`const electronAPI = isElectron() ? (await import('./electron/api')).default : null`
- 保持 Web 核心代码零侵入，通过适配层桥接

### 构建流程
```
pnpm dev:client    # 同时启动 web dev server 和 electron
pnpm build:client  # 先 build:web，再打包 electron
```

## Success Metrics

- Electron 客户端启动时间 < 3 秒
- 打包后的应用体积 < 200MB（包含 Chromium）
- 内存占用 < 500MB（空闲状态）
- 各平台安装包可正常安装和运行基本功能

## Open Questions

1. 是否需要支持代码签名？（macOS 公证、Windows EV 证书）
2. 自动更新的服务器方案？（GitHub Releases、自建更新服务器）
3. 是否需要支持 Windows 商店 / Mac App Store 分发？
4. 文件拖拽是否需要支持文件夹递归上传？
