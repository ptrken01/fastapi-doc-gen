// FastAPI Doc Gen — ExtensionPay integration
// This file should be loaded in the popup via a <script> tag
// Get your extension ID from https://extensionpay.com/dashboard

(function() {
  // ExtensionPay configuration
  // Replace 'fastapi-doc-gen' with your actual ExtensionPay extension ID
  const EXTENSIONPAY_ID = 'fastapi-doc-gen';

  // Check if ExtensionPay is available
  function isExtensionPayAvailable() {
    return typeof ExtensionPay !== 'undefined' && typeof ExtensionPay.open !== 'undefined';
  }

  // Initialize ExtensionPay
  function initExtensionPay() {
    if (typeof ExtensionPay === 'undefined') {
      // Load ExtensionPay script
      const script = document.createElement('script');
      script.src = 'https://extensionpay.com/extended.js';
      script.onload = function() {
        ExtensionPay.init(EXTENSIONPAY_ID, {
          onEvent: function(event) {
            if (event === 'purchased' || event === 'installed') {
              chrome.storage.local.set({ purchaseStatus: 'purchased' });
              // Reload popup to reflect purchase
              location.reload();
            }
          }
        });
      };
      document.head.appendChild(script);
    } else {
      ExtensionPay.init(EXTENSIONPAY_ID);
    }
  }

  // Check purchase status
  async function checkPurchase() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['purchaseStatus'], (result) => {
        if (result.purchaseStatus === 'purchased') {
          resolve(true);
        } else {
          // Ask background script to check with ExtensionPay
          chrome.runtime.sendMessage({ action: 'checkPurchase' }, (response) => {
            resolve(response?.status === 'purchased');
          });
        }
      });
    });
  }

  // Open purchase page
  function openPurchasePage() {
    if (isExtensionPayAvailable()) {
      ExtensionPay.open();
    } else {
      // Fallback: open ExtensionPay website
      window.open('https://extensionpay.com/manage/fastapi-doc-gen', '_blank');
    }
  }

  // Export for use in popup
  window.FastAPIDocGenPay = {
    init: initExtensionPay,
    checkPurchase: checkPurchase,
    openPurchase: openPurchasePage
  };

  // Auto-initialize if ExtensionPay is available
  if (typeof ExtensionPay !== 'undefined') {
    initExtensionPay();
  }
})();
