// FastAPI Doc Gen — background service worker
// Handles purchase verification via ExtensionPay

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install — set up default state
    chrome.storage.local.set({
      purchaseStatus: 'pending',
      capturedEndpoints: [],
      installDate: new Date().toISOString()
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'checkPurchase':
      checkPurchaseStatus().then(status => sendResponse({ status }));
      return true; // Keep message channel open for async response

    case 'captureEndpoints':
      captureFromTab().then(endpoints => sendResponse({ endpoints }));
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

async function checkPurchaseStatus() {
  try {
    const result = await chrome.storage.local.get(['purchaseStatus']);
    return result.purchaseStatus || 'pending';
  } catch (e) {
    return 'error';
  }
}

async function captureFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return [];

    // Execute content script to scan for APIs
    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Return any endpoints captured by the content script
        return window.__fastapiDocGenEndpoints || [];
      }
    });

    return response[0]?.result || [];
  } catch (e) {
    console.error('Capture error:', e);
    return [];
  }
}

// Handle ExtensionPay webhook callbacks
chrome.webNavigation.onCompleted.addListener((details) => {
  // Check if user returned from ExtensionPay purchase page
  if (details.url.includes('extensionpay.com') || details.url.includes('purchase')) {
    checkPurchaseStatus().then(status => {
      if (status === 'purchased') {
        chrome.storage.local.set({ purchaseStatus: 'purchased' });
        // Notify popup if open
        chrome.runtime.sendMessage({ action: 'purchaseComplete' });
      }
    });
  }
}, { url: { schemes: ['https'] } });
