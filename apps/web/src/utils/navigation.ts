/**
 * 导航工具模块
 * 提供在非组件环境中使用 React Router 导航的能力
 * 
 * 使用方式：
 * 1. 在 App.tsx 中调用 setNavigate() 设置 navigate 函数
 * 2. 在其他地方调用 navigate() 进行路由跳转
 */

// 保存 navigate 函数
let navigateFunction: ((path: string, options?: { replace?: boolean }) => void) | null = null;

/**
 * 设置 navigate 函数（需要在 React 组件中调用）
 */
export function setNavigate(navigate: (path: string, options?: { replace?: boolean }) => void): void {
  navigateFunction = navigate;
}

/**
 * 跳转到指定路径
 * 需要先调用 setNavigate 设置 navigate 函数
 */
export function navigate(path: string, options?: { replace?: boolean }): void {
  if (navigateFunction) {
    navigateFunction(path, options);
  } else {
    // 如果没有设置 navigate 函数，降级使用 window.location
    console.warn('navigate function not set, falling back to window.location');
    window.location.href = path;
  }
}
