// Content script - injected into web pages
console.log('AIMO content script loaded');

// Listen for selection changes
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection()?.toString() || '';
  if (selection.length > 0) {
    console.log('Text selected:', selection.substring(0, 100));
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    const selectedText = window.getSelection()?.toString() || '';
    sendResponse({ text: selectedText });
  }
  return true;
});

export {};
