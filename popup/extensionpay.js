// FastAPI Doc Gen — ExtensionPay integration
// Loaded as a web_accessible_resource so it can load the ExtensionPay remote script.
(function () {
  'use strict';

  // Load ExtensionPay extended.js in the MAIN world so ExtensionPay can read/set
  // the purchase cookie. We append it to document.body.
  function loadExtensionPayScript() {
    return new Promise((resolve, reject) => {
      if (typeof window.ExtensionPay !== 'undefined') {
        resolve(window.ExtensionPay);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://extensionpay.com/extended.js';
      s.async = true;
      s.onload = () => resolve(window.ExtensionPay);
      s.onerror = () => reject(new Error('Failed to load ExtensionPay script'));
      document.body.appendChild(s);
    });
  }

  async function initExtensionPay() {
    const EP = await loadExtensionPayScript();
    EP.init(window.FastAPIDocGenConfig.EXTENSIONPAY_ID, {
      onEvent: function (event) {
        if (event === 'purchased' || event === 'installed') {
          chrome.storage.local.set({ purchaseStatus: 'purchased' });
          // Reload popup to reflect purchase
          if (window.location.protocol.startsWith('chrome-extension')) {
            location.reload();
          }
        }
      }
    });
    return EP;
  }

  // Check purchase status via ExtensionPay
  async function checkPurchase() {
    try {
      const local = await chrome.storage.local.get(['purchaseStatus']);
      if (local.purchaseStatus === 'purchased') return true;
    } catch (e) { /* ignore */ }

    try {
      const EP = await initExtensionPay();
      const user = await EP.getUser();
      if (user && (user.paid || user.installed)) {
        await chrome.storage.local.set({ purchaseStatus: 'purchased' });
        return true;
      }
    } catch (e) {
      // Network or script error — fall through to not-purchased
    }
    return false;
  }

  function openPurchasePage() {
    if (typeof window.ExtensionPay !== 'undefined') {
      window.ExtensionPay.open();
    } else {
      window.open('https://extensionpay.com/manage/' + window.FastAPIDocGenConfig.EXTENSIONPAY_ID, '_blank');
    }
  }

  window.FastAPIDocGenPay = {
    init: initExtensionPay,
    checkPurchase: checkPurchase,
    openPurchase: openPurchasePage
  };
})();
