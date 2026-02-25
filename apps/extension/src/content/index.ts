// Content script - injected into web pages
// Provides floating toolbar for saving content to AIMO

import type { ExtractedContent } from '../types';

// Toolbar state
let toolbarContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentSelection: ExtractedContent | null = null;
let hideTimeout: number | null = null;

// AIMO brand colors
const COLORS = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  background: {
    light: '#ffffff',
    dark: '#1f2937',
  },
  text: {
    light: '#374151',
    dark: '#f3f4f6',
  },
  border: {
    light: '#e5e7eb',
    dark: '#374151',
  },
  shadow: {
    light: '0 4px 12px rgba(0, 0, 0, 0.15)',
    dark: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
};

/**
 * Check if user prefers dark mode
 */
function isDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get theme-aware styles
 */
function getThemeStyles(): {
  background: string;
  text: string;
  border: string;
  shadow: string;
} {
  const dark = isDarkMode();
  return {
    background: dark ? COLORS.background.dark : COLORS.background.light,
    text: dark ? COLORS.text.dark : COLORS.text.light,
    border: dark ? COLORS.border.dark : COLORS.border.light,
    shadow: dark ? COLORS.shadow.dark : COLORS.shadow.light,
  };
}

/**
 * Create the toolbar element with shadow DOM
 */
function createToolbar(): HTMLElement {
  // Create container
  const container = document.createElement('div');
  container.id = 'aimo-toolbar-container';

  // Attach shadow DOM for style isolation
  shadowRoot = container.attachShadow({ mode: 'closed' });

  // Create toolbar element
  const toolbar = document.createElement('div');
  toolbar.id = 'aimo-toolbar';

  // Get theme styles
  const theme = getThemeStyles();

  // Add styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    #aimo-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: ${theme.background};
      border: 1px solid ${theme.border};
      border-radius: 8px;
      box-shadow: ${theme.shadow};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: ${theme.text};
      cursor: default;
      user-select: none;
      animation: aimo-fade-in 0.15s ease-out;
      z-index: 2147483647;
    }

    @keyframes aimo-fade-in {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #aimo-toolbar.hidden {
      animation: aimo-fade-out 0.1s ease-in forwards;
    }

    @keyframes aimo-fade-out {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(4px);
      }
    }

    .aimo-logo {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .aimo-divider {
      width: 1px;
      height: 16px;
      background: ${theme.border};
      margin: 0 4px;
    }

    .aimo-save-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: ${COLORS.primary};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .aimo-save-btn:hover {
      background: ${COLORS.primaryHover};
    }

    .aimo-save-btn:active {
      transform: scale(0.98);
    }

    .aimo-save-btn svg {
      width: 14px;
      height: 14px;
    }

    .aimo-type-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: ${theme.text};
      opacity: 0.7;
    }

    .aimo-type-indicator svg {
      width: 14px;
      height: 14px;
    }
  `;

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(toolbar);

  return container;
}

/**
 * Get AIMO logo SVG
 */
function getLogoSVG(): string {
  return `<svg class="aimo-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="${COLORS.primary}"/>
    <path d="M7 12L10.5 15.5L17 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * Get save icon SVG
 */
function getSaveIconSVG(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>`;
}

/**
 * Get text icon SVG
 */
function getTextIconSVG(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`;
}

/**
 * Get image icon SVG
 */
function getImageIconSVG(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`;
}

/**
 * Update toolbar content based on current selection
 */
function updateToolbarContent(): void {
  if (!shadowRoot || !currentSelection) return;

  const toolbar = shadowRoot.getElementById('aimo-toolbar');
  if (!toolbar) return;

  const isImage = currentSelection.type === 'image';
  const typeLabel = isImage ? '图片' : '文本';
  const typeIcon = isImage ? getImageIconSVG() : getTextIconSVG();

  toolbar.innerHTML = `
    ${getLogoSVG()}
    <div class="aimo-type-indicator">
      ${typeIcon}
      <span>${typeLabel}</span>
    </div>
    <div class="aimo-divider"></div>
    <button class="aimo-save-btn" id="aimo-save-btn">
      ${getSaveIconSVG()}
      <span>保存到 AIMO</span>
    </button>
  `;

  // Add click handler to save button
  const saveBtn = toolbar.querySelector('#aimo-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveClick);
  }
}

/**
 * Position toolbar near the selection or image
 */
function positionToolbar(rect: DOMRect): void {
  if (!toolbarContainer) return;

  // Calculate position (bottom-right of selection with some offset)
  const offset = 8;
  let left = rect.right + offset - 150; // Center horizontally relative to right edge
  let top = rect.bottom + offset;

  // Ensure toolbar stays within viewport
  const toolbarWidth = 200;
  const toolbarHeight = 50;

  if (left + toolbarWidth > window.innerWidth) {
    left = window.innerWidth - toolbarWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }
  if (top + toolbarHeight > window.innerHeight + window.scrollY) {
    // Position above selection if not enough space below
    top = rect.top + window.scrollY - toolbarHeight - offset;
  } else {
    top += window.scrollY;
  }

  toolbarContainer.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    z-index: 2147483647;
  `;
}

/**
 * Show the toolbar
 */
function showToolbar(): void {
  if (!toolbarContainer) {
    toolbarContainer = createToolbar();
    document.body.appendChild(toolbarContainer);
  }

  updateToolbarContent();

  // Clear any pending hide
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

/**
 * Hide the toolbar
 */
function hideToolbar(): void {
  if (!toolbarContainer || !shadowRoot) return;

  const toolbar = shadowRoot.getElementById('aimo-toolbar');
  if (toolbar) {
    toolbar.classList.add('hidden');
  }

  // Remove after animation
  hideTimeout = window.setTimeout(() => {
    if (toolbarContainer) {
      toolbarContainer.remove();
      toolbarContainer = null;
      shadowRoot = null;
    }
    currentSelection = null;
  }, 100);
}

/**
 * Handle save button click
 */
async function handleSaveClick(): Promise<void> {
  if (!currentSelection) return;

  try {
    // Store the content to session storage
    const message = {
      type: 'SAVE_CONTENT',
      data: currentSelection,
    };

    // Send message to background script
    const response = await chrome.runtime.sendMessage(message);

    if (response?.success) {
      // Open popup after saving to storage
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      hideToolbar();
    } else {
      console.error('Failed to save content:', response?.error);
      // Show error to user
      showNotification(response?.error || '保存失败，请检查扩展配置', 'error');
    }
  } catch (error) {
    console.error('Error saving content:', error);
    showNotification('保存失败，请检查网络连接', 'error');
  }
}

/**
 * Show a notification message on the page
 * @param message - Message to display
 * @param type - Notification type ('success' | 'error')
 */
function showNotification(message: string, type: 'success' | 'error'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#dc2626' : '#16a34a'};
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    animation: aimo-notification-slide-in 0.3s ease-out;
  `;
  notification.textContent = message;

  // Add animation styles if not already present
  if (!document.getElementById('aimo-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'aimo-notification-styles';
    style.textContent = `
      @keyframes aimo-notification-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes aimo-notification-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'aimo-notification-slide-out 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Get selection coordinates
 */
function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;

  return range.getBoundingClientRect();
}

/**
 * Handle text selection change
 */
function handleSelectionChange(): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || '';

  if (selectedText.length > 0) {
    const rect = getSelectionRect();
    if (rect) {
      currentSelection = {
        type: 'text',
        content: selectedText,
        sourceUrl: window.location.href,
        sourceTitle: document.title,
      };
      showToolbar();
      positionToolbar(rect);
    }
  } else if (!currentSelection || currentSelection.type === 'text') {
    // Only hide if we had a text selection (not an image)
    hideToolbar();
  }
}

/**
 * Extract image URL from an element (handles <img> and background-image)
 */
function extractImageUrl(element: HTMLElement): string | null {
  // Check if it's an <img> tag
  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    if (img.src) return img.src;
  }

  // Check for background-image style
  const computedStyle = window.getComputedStyle(element);
  const backgroundImage = computedStyle.backgroundImage;

  // Parse background-image: url("...") or url('...')
  if (backgroundImage && backgroundImage !== 'none') {
    const match = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (match?.[1]) {
      // Handle relative URLs
      if (match[1].startsWith('http')) {
        return match[1];
      } else if (match[1].startsWith('//')) {
        return `${window.location.protocol}${match[1]}`;
      } else if (match[1].startsWith('/')) {
        return `${window.location.origin}${match[1]}`;
      } else {
        // Relative path
        const basePath = window.location.href.substring(
          0,
          window.location.href.lastIndexOf('/') + 1
        );
        return `${basePath}${match[1]}`;
      }
    }
  }

  return null;
}

/**
 * Check if element has a visible image (either <img> or background-image)
 */
function hasVisibleImage(element: HTMLElement): boolean {
  // Check if it's an <img> tag with reasonable size
  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    return img.width >= 50 && img.height >= 50;
  }

  // Check for background-image with reasonable element size
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
    const rect = element.getBoundingClientRect();
    return rect.width >= 50 && rect.height >= 50;
  }

  return false;
}

/**
 * Handle image click
 */
function handleImageClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  // Skip if clicking inside the AIMO toolbar
  if (target.closest('#aimo-toolbar-container')) return;

  // Check if the element or its parent has an image
  let element: HTMLElement | null = target;
  let imageUrl: string | null = null;

  // Try to find image on the clicked element or its parents
  while (element && element !== document.body) {
    imageUrl = extractImageUrl(element);
    if (imageUrl && hasVisibleImage(element)) {
      break;
    }
    imageUrl = null;
    element = element.parentElement;
  }

  if (imageUrl && element) {
    event.preventDefault();
    event.stopPropagation();

    const rect = element.getBoundingClientRect();
    currentSelection = {
      type: 'image',
      content: imageUrl,
      sourceUrl: window.location.href,
      sourceTitle: document.title,
    };

    showToolbar();
    positionToolbar(rect);
  }
}

/**
 * Handle clicks outside the toolbar
 */
function handleDocumentClick(event: MouseEvent): void {
  if (!toolbarContainer) return;

  const target = event.target as Node;

  // Don't hide if clicking inside the toolbar
  if (toolbarContainer.contains(target)) return;

  // Don't hide if clicking on an image (handled by image click)
  if ((event.target as HTMLElement).tagName === 'IMG') return;

  // Clear text selection and hide toolbar
  hideToolbar();
}

/**
 * Handle scroll events (hide toolbar)
 */
function handleScroll(): void {
  if (toolbarContainer && currentSelection?.type === 'text') {
    hideToolbar();
  }
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Debounced selection handler
const debouncedSelectionChange = debounce(handleSelectionChange, 100);

// Listen for selection changes
document.addEventListener('selectionchange', debouncedSelectionChange);

// Listen for image clicks
document.addEventListener('click', handleImageClick);

// Listen for clicks outside toolbar (delayed to avoid immediate close on selection)
document.addEventListener(
  'click',
  (e) => {
    setTimeout(() => handleDocumentClick(e), 0);
  },
  true
);

// Listen for scroll events
window.addEventListener('scroll', handleScroll, { passive: true });

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (toolbarContainer && currentSelection) {
    // Recreate toolbar with new theme
    hideToolbar();
    setTimeout(() => {
      showToolbar();
      const rect = getSelectionRect();
      if (rect) {
        positionToolbar(rect);
      }
    }, 100);
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SELECTED_TEXT': {
      const selectedText = window.getSelection()?.toString() || '';
      sendResponse({ text: selectedText });
      break;
    }
    case 'HIDE_TOOLBAR': {
      hideToolbar();
      sendResponse({ success: true });
      break;
    }
    default:
      break;
  }
  return true;
});

console.log('AIMO content script loaded');

export {};
