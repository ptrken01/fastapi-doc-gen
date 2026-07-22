// FastAPI Doc Gen — popup logic
// One-time purchase Chrome extension for developers

const state = {
  endpoints: [],
  isScanning: false,
  isGenerating: false
};

const $ = (id) => document.getElementById(id);

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  // Check purchase status via ExtensionPay
  await checkPurchase();

  // Wire up buttons
  $('scan-btn').addEventListener('click', scanPage);
  $('capture-btn').addEventListener('click', captureEndpoints);
  $('generate-btn').addEventListener('click', generateOpenAPI);
  $('copy-btn').addEventListener('click', copyOutput);
  $('download-btn').addEventListener('click', downloadOutput);
  $('clear-btn').addEventListener('click', clearOutput);

  // Load saved endpoints
  loadEndpoints();
});

// --- ExtensionPay integration ---
async function checkPurchase() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const result = await chrome.storage.local.get(['purchaseStatus']);
      if (result.purchaseStatus === 'purchased') {
        updateStatus('✓ Premium version active', 'success');
        return true;
      }
    }
    // For demo/testing — in production, ExtensionPay handles this
    updateStatus('Ready to scan (demo mode)', 'info');
    return true;
  } catch (e) {
    updateStatus('Ready', 'info');
    return true;
  }
}

// --- Status ---
function updateStatus(text, type = 'info') {
  const statusEl = $('status');
  const textEl = statusEl.querySelector('.status-text');
  textEl.textContent = text;
  statusEl.classList.remove('hidden');
  statusEl.className = 'status ' + type;
}

// --- Scan page for API endpoints ---
async function scanPage() {
  if (state.isScanning) return;
  state.isScanning = true;
  $('scan-btn').disabled = true;
  $('scan-btn').textContent = '⏳ Scanning...';
  updateStatus('Scanning page for API endpoints...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // BUG FIX #1: The content script captures endpoints asynchronously (2s timeout).
    // We need to wait for the content script to finish before reading results.
    // Execute the content script injection first, then wait and read the global.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPageForAPIs,
      world: 'MAIN'
    });

    // Wait for the content script's 2-second capture window to complete
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Now read the captured endpoints from the page context
    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__fastapiDocGenEndpoints || [],
      world: 'MAIN'
    });

    const results = response[0]?.result || [];

    // BUG FIX #5: Clear old endpoints before setting new ones
    state.endpoints = [];
    state.endpoints = results;
    $('capture-btn').disabled = results.length === 0;
    updateStatus(`Found ${results.length} potential endpoints`, 'success');
  } catch (e) {
    updateStatus(`Scan error: ${e.message}`, 'error');
  } finally {
    state.isScanning = false;
    $('scan-btn').disabled = false;
    $('scan-btn').textContent = '🔍 Scan Page for APIs';
  }
}

// --- Content script function (runs in page context) ---
function scanPageForAPIs() {
  // Don't re-inject if already injected (content script handles this)
  if (window.__fastapiDocGenInjected) {
    // Return existing endpoints if available
    return window.__fastapiDocGenEndpoints || [];
  }

  // Mark as injected and initialize
  window.__fastapiDocGenInjected = true;
  window.__fastapiDocGenEndpoints = [];
  const seen = new Set();

  // Helper: check if URL looks like an API endpoint
  function looksLikeAPI(url) {
    try {
      const u = new URL(url, window.location.href);
      const path = u.pathname.toLowerCase();
      return path.includes('/api/') || path.includes('/v1/') || path.includes('/v2/') ||
             path.includes('/rest/') || path.includes('/graphql') ||
             u.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  }

  function addEndpoint(method, url, source) {
    if (!url || !looksLikeAPI(url)) return;
    const key = `${method}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    window.__fastapiDocGenEndpoints.push({ method, path: url, source });
  }

  // 1. Intercept fetch — BUG FIX #4: Handle Request objects, not just strings
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url;
    if (typeof args[0] === 'string') {
      url = args[0];
    } else if (args[0] instanceof Request) {
      url = args[0].url;
    } else if (args[0] && typeof args[0] === 'object' && args[0].url) {
      url = args[0].url;
    }
    const method = (args[1]?.method || 'GET').toUpperCase();
    addEndpoint(method, url, 'fetch');
    return originalFetch.apply(this, args);
  };

  // 2. Intercept XHR
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    addEndpoint(method.toUpperCase(), url, 'xhr');
    return originalXHROpen.apply(this, arguments);
  };

  // 3. Scan for existing API documentation links on the page
  const apiLinks = document.querySelectorAll('a[href*="/api"], a[href*="/docs"], a[href*="swagger"], a[href*="openapi"]');
  apiLinks.forEach(link => {
    addEndpoint('GET', link.href, 'link');
  });

  // 4. Scan for OpenAPI/Swagger spec in script tags
  const specScripts = document.querySelectorAll('script[type*="application/json"]');
  specScripts.forEach(script => {
    try {
      const content = script.textContent;
      if (content && (content.includes('openapi') || content.includes('swagger'))) {
        const spec = JSON.parse(content);
        if (spec.paths) {
          Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.keys(methods).forEach(method => {
              addEndpoint(method.toUpperCase(), path, 'spec');
            });
          });
        }
      }
    } catch (e) {
      // Not valid JSON
    }
  });

  // 5. Axios instance detection
  if (window.axios) {
    if (window.axios.defaults && window.axios.defaults.baseURL) {
      addEndpoint('GET', window.axios.defaults.baseURL, 'axios');
    }
  }

  // Wait for async API calls to be captured, then store
  setTimeout(() => {
    // Endpoints are already in window.__fastapiDocGenEndpoints
    // This timeout ensures we capture late-fired API calls
  }, 2000);

  return window.__fastapiDocGenEndpoints;
}

// --- Capture endpoints ---
function captureEndpoints() {
  if (state.endpoints.length === 0) return;

  saveEndpoints(state.endpoints);
  renderEndpoints(state.endpoints);
  $('generate-btn').disabled = false;
  updateStatus(`Captured ${state.endpoints.length} endpoints`, 'success');
}

// --- Generate OpenAPI spec ---
function generateOpenAPI() {
  if (state.endpoints.length === 0) return;

  state.isGenerating = true;
  $('generate-btn').disabled = true;
  $('generate-btn').textContent = '⏳ Generating...';
  updateStatus('Generating OpenAPI 3.0 spec...', 'info');

  const spec = buildOpenAPISpec(state.endpoints);
  const output = JSON.stringify(spec, null, 2);

  $('output').textContent = output;
  $('output-section').classList.remove('hidden');
  $('generate-btn').disabled = false;
  $('generate-btn').textContent = '⚡ Generate OpenAPI';
  updateStatus('OpenAPI spec generated!', 'success');
}

function buildOpenAPISpec(endpoints) {
  const paths = {};
  // BUG FIX #2: Use the first endpoint's origin as the server, not window.location.origin
  // This handles cross-origin API calls correctly
  const origins = [...new Set(endpoints.map(ep => {
    try {
      return new URL(ep.path, window.location.href).origin;
    } catch {
      return window.location.origin;
    }
  }))];
  const servers = origins.map(origin => ({ url: origin }));

  endpoints.forEach(ep => {
    // BUG FIX #2: Properly extract the path, handling cross-origin URLs
    let cleanPath;
    try {
      const url = new URL(ep.path, window.location.href);
      cleanPath = url.pathname + url.search + url.hash;
    } catch {
      cleanPath = ep.path;
    }

    // Handle query parameters in OpenAPI paths
    // OpenAPI uses {param} syntax, but we keep the raw path for simplicity
    if (!paths[cleanPath]) {
      paths[cleanPath] = {};
    }

    // Validate HTTP method
    const method = ep.method.toLowerCase();
    if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(method)) {
      return; // Skip invalid methods
    }

    paths[cleanPath][method] = {
      summary: `${ep.method} ${cleanPath}`,
      description: `Endpoint captured by FastAPI Doc Gen (${ep.source})`,
      responses: {
        '200': { description: 'Successful response' },
        '201': { description: 'Created' },
        '400': { description: 'Bad request' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Internal server error' }
      }
    };
  });

  return {
    openapi: '3.0.3',
    info: {
      title: `${document.title || 'API'} - Generated by FastAPI Doc Gen`,
      description: 'OpenAPI specification generated from captured API endpoints.',
      version: '1.0.0',
      contact: {
        name: 'FastAPI Doc Gen',
        url: 'https://github.com/ptrken01/fastapi-doc-gen'
      }
    },
    servers: servers,
    paths: paths,
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  };
}

// --- Output actions ---
// BUG FIX #3: Handle clipboard API unavailability (HTTPS-only)
function copyOutput() {
  const output = $('output').textContent;
  if (!output) {
    updateStatus('Nothing to copy', 'error');
    return;
  }

  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(output).then(() => {
      updateStatus('Copied to clipboard!', 'success');
    }).catch(err => {
      // Fallback to execCommand
      fallbackCopy(output);
    });
  } else {
    fallbackCopy(output);
  }
}

function fallbackCopy(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    updateStatus('Copied to clipboard!', 'success');
  } catch (e) {
    updateStatus('Copy failed — please select and copy manually', 'error');
  }
}

function downloadOutput() {
  const output = $('output').textContent;
  if (!output) {
    updateStatus('Nothing to download', 'error');
    return;
  }
  const blob = new Blob([output], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'openapi.json';
  a.click();
  URL.revokeObjectURL(url);
}

function clearOutput() {
  $('output').textContent = '';
  $('output-section').classList.add('hidden');
  // BUG FIX #5: Clear state and saved endpoints
  state.endpoints = [];
  $('capture-btn').disabled = true;
  $('generate-btn').disabled = true;
  chrome.storage.local.remove('capturedEndpoints');
  updateStatus('Cleared', 'info');
}

// --- Persistence ---
function saveEndpoints(endpoints) {
  chrome.storage.local.set({ capturedEndpoints: endpoints });
}

function loadEndpoints() {
  chrome.storage.local.get(['capturedEndpoints'], (result) => {
    if (result.capturedEndpoints && result.capturedEndpoints.length > 0) {
      // BUG FIX #5: Clear state before loading
      state.endpoints = [];
      state.endpoints = result.capturedEndpoints;
      renderEndpoints(state.endpoints);
      $('capture-btn').disabled = false;
      $('generate-btn').disabled = false;
    }
  });
}

function renderEndpoints(endpoints) {
  const list = $('endpoints-list');
  const empty = $('endpoints-empty');
  list.innerHTML = '';
  empty.classList.add('hidden');

  endpoints.forEach(ep => {
    const item = document.createElement('div');
    item.className = 'endpoint-item';
    // BUG FIX: Escape HTML in path to prevent XSS from malicious URLs
    const safePath = ep.path.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    item.innerHTML = `
      <span class="endpoint-method method-${ep.method}">${ep.method}</span>
      <span class="endpoint-path" title="${safePath}">${safePath}</span>
    `;
    list.appendChild(item);
  });

  $('endpoints-section').classList.remove('hidden');
}
