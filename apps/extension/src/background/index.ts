// Service worker for Chrome Extension
import { addPendingItem, getPendingItemsCount, clearPendingItems } from '../storage';
import type { ExtractedContent } from '../types';

console.log('AIMO background service worker started');

/**
 * Set the extension badge with a specific count
 * @param count - Number to display on badge (0 to clear)
 */
export async function setBadge(count: number): Promise<void> {
  try {
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Failed to set badge:', error);
  }
}

/**
 * Update the extension badge with pending items count
 */
async function updateBadge(): Promise<void> {
  try {
    const count = await getPendingItemsCount();
    await setBadge(count);
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

/**
 * Open the extension popup
 */
function openPopup(): void {
  // The popup opens automatically when user clicks the extension icon
  // We can't programmatically open it, but we can trigger the action
  chrome.action.openPopup?.().catch(() => {
    // Fallback: user needs to click the icon
    console.log('Please click the AIMO extension icon to view saved content');
  });
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AIMO extension installed:', details.reason);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, 'from:', sender.id);

  // Handle different message types
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'pong' });
      break;

    case 'SAVE_CONTENT': {
      // Save extracted content to pending items
      const content = message.data as ExtractedContent;
      addPendingItem({
        type: content.type,
        content: content.content,
        sourceUrl: content.sourceUrl,
        sourceTitle: content.sourceTitle,
      })
        .then(() => updateBadge())
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to save content:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true; // Keep channel open for async response
    }

    case 'OPEN_POPUP':
      openPopup();
      sendResponse({ success: true });
      break;

    case 'UPDATE_BADGE':
      updateBadge()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to update badge:', error);
          sendResponse({ success: false, error: String(error) });
        });
      return true;

    case 'CLEAR_ALL_ITEMS':
      clearPendingItems()
        .then(() => updateBadge())
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to clear all items:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true;

    case 'SET_BADGE':
      {
        const { count } = message.data as { count: number };
        setBadge(count)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Failed to set badge:', error);
            sendResponse({ success: false, error: String(error) });
          });
      }
      return true;

    case 'GET_TAB_INFO':
      // Get current tab info for content extraction
      chrome.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          const tab = tabs[0];
          if (tab) {
            sendResponse({
              success: true,
              url: tab.url,
              title: tab.title,
            });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        })
        .catch((error) => {
          console.error('Failed to get tab info:', error);
          sendResponse({ success: false, error: String(error) });
        });
      return true;

    default:
      console.log('Unknown message type:', message.type);
  }

  return true; // Keep message channel open for async responses
});

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', namespace, changes);
  if (namespace === 'session' && changes.aimo_pending_items) {
    updateBadge();
  }
});

// Initialize badge on startup
updateBadge();

export {};
