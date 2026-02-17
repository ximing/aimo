# AIMO Web 项目主题指南

本文档详细说明了 AIMO Web 项目的整体主题设计系统，包括颜色系统、排版、动画、主题切换机制等。此文档可作为开发移动应用（App）时的参考。

## 目录

1. [主题系统概览](#主题系统概览)
2. [颜色系统](#颜色系统)
3. [排版和字体](#排版和字体)
4. [动画和过渡](#动画和过渡)
5. [主题切换机制](#主题切换机制)
6. [布局规范](#布局规范)
7. [组件样式规范](#组件样式规范)
8. [实现细节](#实现细节)
9. [开发最佳实践](#开发最佳实践)

---

## 主题系统概览

AIMO Web 采用现代化的设计系统，支持**亮色模式**和**暗色模式**两套完整主题。

### 关键特性

- ✅ **双主题支持**: 亮色（Light）和暗色（Dark）两种模式
- ✅ **响应式主题切换**: 基于用户偏好和系统设置自动适配
- ✅ **持久化存储**: 用户主题偏好保存至 localStorage
- ✅ **流畅过渡**: CSS 过渡动画确保主题切换体验顺滑
- ✅ **无缝集成**: 使用 Tailwind CSS `dark:` 前缀实现主题支持

### 技术栈

- **CSS 框架**: Tailwind CSS 3.4.17
- **主题实现**: CSS class-based（通过 `dark` class）
- **持久化**: localStorage API
- **状态管理**: @rabjs/react（ThemeService）

---

## 颜色系统

### 1. 主色系统 (Primary Colors)

主色采用**绿色**系列，共 11 个层级，从浅到深。

```css
/* Primary Color Palette */
primary-50:   #f0fdf4  /* 最浅，用于背景高亮 */
primary-100:  #dcfce7
primary-200:  #bbf7d0
primary-300:  #86efac
primary-400:  #4ade80
primary-500:  #22c55e  /* 主色 - 用于主要交互元素 */
primary-600:  #16a34a  /* Hover 状态 */
primary-700:  #15803d  /* Active 状态 */
primary-800:  #166534
primary-900:  #145231
primary-950:  #0d3422  /* 最深 */
```

#### 主色使用场景

| 层级 | 颜色值 | 使用场景 | 示例 |
|------|------|--------|------|
| 50 | #f0fdf4 | 背景高亮、按钮悬停背景 | 导航按钮 active 背景 |
| 100 | #dcfce7 | 浅色背景、禁用状态背景 | 组件背景 |
| 200 | #bbf7d0 | 边框、分割线 | 输入框边框 |
| 500 | #22c55e | 主要交互元素、文字 | 主按钮、链接文字 |
| 600 | #16a34a | Hover 状态加深 | 按钮 hover |
| 700 | #15803d | Active 状态 | 按钮 active |

### 2. 中性色系统 (Gray Colors)

使用 Tailwind 默认灰色系统，适用于文字、边框、背景等。

#### 亮色模式 (Light Mode)

```
gray-50:   #f9fafb   /* 页面背景 */
gray-100:  #f3f4f6   /* 卡片背景 */
gray-200:  #e5e7eb   /* 边框、分割线 */
gray-300:  #d1d5db
gray-400:  #9ca3af   /* 次要图标 */
gray-500:  #6b7280   /* 次要文字 */
gray-600:  #4b5563   /* 正常文字 */
gray-700:  #374151
gray-900:  #1f2937   /* 主要文字 */
```

#### 暗色模式 (Dark Mode - 磨砂深灰黑)

自定义暗色色系，采用深灰黑色调：

```
dark-50:   #fafafa   /* 高亮文字 */
dark-100:  #f5f5f5   /* 高亮元素 */
dark-200:  #eeeeee   /* 强调文字 */
dark-300:  #e0e0e0   /* 强调边框 */
dark-400:  #a0a0a0   /* 次要图标 */
dark-500:  #757575   /* 次要文字 */
dark-600:  #5a5a5a
dark-700:  #424242   /* 组件边框、分割线 */
dark-800:  #2a2a2a   /* 卡片背景 */
dark-900:  #1a1a1a   /* 页面背景（主） */
dark-950:  #121212   /* 深色背景（次） */
```

### 3. 特殊颜色

#### 红色系（警告/删除）

```
red-50:   #fef2f2
red-400:  #f87171   /* 浅红 - Hover 状态 */
red-600:  #dc2626   /* 深红 - 文字/按钮 */
red-900:  #7f1d1d   /* 深色模式背景 */
```

### 4. 语义色彩应用

#### 亮色模式 (Light Mode)

| 元素 | 颜色 | 用途 |
|------|------|------|
| 页面背景 | white / gray-50 (#f9fafb) | 整个页面背景 |
| 卡片背景 | white | 内容卡片、容器 |
| 正文文字 | gray-900 (#1f2937) | 主要内容文字 |
| 次级文字 | gray-600 (#4b5563) | 时间戳、辅助信息 |
| 禁用文字 | gray-400 (#9ca3af) | 禁用状态文字 |
| 边框/分割线 | gray-200 (#e5e7eb) | 容器边框、分割线 |
| 图标 | gray-600 (#4b5563) | 默认图标颜色 |
| 悬停背景 | gray-100 (#f3f4f6) | 卡片 hover 背景 |

#### 暗色模式 (Dark Mode)

| 元素 | 颜色 | 用途 |
|------|------|------|
| 页面背景 | dark-900 (#1a1a1a) | 整个页面背景（主） |
| 深色背景 | dark-950 (#121212) | 深色背景（次） |
| 卡片背景 | dark-800 (#2a2a2a) | 内容卡片、容器 |
| 正文文字 | gray-50 (#f9fafb) | 主要内容文字 |
| 次级文字 | gray-400 (#9ca3af) | 时间戳、辅助信息 |
| 禁用文字 | gray-600 (#5a5a5a) | 禁用状态文字 |
| 边框/分割线 | dark-700 (#424242) | 容器边框、分割线 |
| 图标 | gray-400 (#9ca3af) | 默认图标颜色 |
| 悬停背景 | dark-700 (#424242) | 卡片 hover 背景 |

---

## 排版和字体

### 字体系列

```css
/* 系统字体栈 */
font-family:
  Menlo,
  'Meslo LG',
  'Helvetica Neue',
  Helvetica,
  Arial,
  sans-serif,
  '微软雅黑',
  monospace,
  system-ui,
  -apple-system,
  'Segoe UI',
  Roboto;
```

### 字体大小和排版规范

#### 文字尺度

| 尺度 | 大小 | 用途 | 示例 |
|------|------|------|------|
| xs | 0.75rem (12px) | 小标签、时间戳 | 创建时间、标签文字 |
| sm | 0.875rem (14px) | 次要内容 | 卡片摘要、辅助信息 |
| base | 1rem (16px) | 正文、按钮 | 主要文字内容 |
| lg | 1.125rem (18px) | 小标题 | 卡片标题 |
| xl | 1.25rem (20px) | 模态框标题 | 对话框头 |

#### 行高

```css
line-height: 1.5;  /* 默认行高，确保文字舒适 */
```

### 字体权重

```
font-light:   300   /* 较细 - 不常用 */
font-normal:  400   /* 默认 - 正文 */
font-medium:  500   /* 中等 - 按钮、小标题 */
font-semibold: 600  /* 半粗 - 标题 */
font-bold:    700   /* 粗 - 强调标题 */
```

### 文本渲染优化

```css
/* 亮色模式 */
color-scheme: light;
font-synthesis: none;
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;

/* 暗色模式 */
html.dark {
  color-scheme: dark;
}
```

---

## 动画和过渡

### 预定义动画

#### 1. 淡入 (Fade In)

```css
animation: fadeIn 0.3s ease-in-out;

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
```

**使用场景**: 列表项加载、模态框出现、新元素加入

```tsx
<div className="animate-fade-in">
  {/* 内容 */}
</div>
```

#### 2. 向上滑动 (Slide Up)

```css
animation: slideUp 0.3s ease-out;

@keyframes slideUp {
  0% {
    transform: translateY(8px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**使用场景**: 下拉菜单出现、抽屉打开、通知提示

### 过渡 (Transition)

#### 颜色过渡

```tsx
className="transition-colors"
```

**常见应用**:
- 背景色变化 (hover 状态)
- 文字颜色变化
- 边框颜色变化

#### 不透明度过渡

```tsx
className="transition-opacity"
```

**常见应用**:
- 悬停时显示隐藏元素
- 加载状态指示

#### 尺度过渡

```tsx
className="scale-102"  /* 1.02 倍放大 */
```

#### 所有过渡

```tsx
className="transition-all"
```

**常见应用**:
- 多个属性同时变化时使用

### 过渡时长

```css
duration-150   /* 150ms - 快速交互反馈 */
duration-300   /* 300ms - 标准过渡 */
duration-500   /* 500ms - 缓慢过渡 */
```

---

## 对 App 开发的建议

在为移动应用（App）应用此主题系统时，建议：

1. **保持颜色一致性**: 使用相同的颜色值，特别是主色（#22c55e）
2. **适应平台规范**: 根据 iOS/Android 设计指南调整大小和间距
3. **触控友好性**: 确保交互元素足够大，便于触控（最小 44x44pt）
4. **性能优先**: 减少过渡动画，优化滚动性能
5. **深色模式**: 在 iOS 和 Android 上都实现完整的深色模式支持
6. **安全区域**: 考虑 iOS 的安全区域和 Android 的系统控件空间
7. **字体大小**: 可能需要根据移动设备调整基础字体大小