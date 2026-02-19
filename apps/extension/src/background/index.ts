// Service worker for Chrome Extension
console.log('AIMO background service worker started');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('AIMO extension installed:', details.reason);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender.id);

  // Handle different message types
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'pong' });
      break;
    default:
      console.log('Unknown message type:', message.type);
  }

  return true; // Keep message channel open for async responses
});

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', namespace, changes);
});

export {};
