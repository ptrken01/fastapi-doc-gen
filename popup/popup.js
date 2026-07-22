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
    // ExtensionPay script will be injected
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
    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPageForAPIs,
      world: 'MAIN'
    });

    const results = response[0]?.result || [];
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
  const endpoints = [];
  const seen = new Set();

  // 1. Intercept fetch/XHR calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && looksLikeAPI(url)) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      const key = `${method}:${url}`;
      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push({ method, path: url, source: 'fetch' });
      }
    }
    return originalFetch.apply(this, args);
  };

  // 2. Intercept XHR
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (url && looksLikeAPI(url)) {
      const key = `${method.toUpperCase()}:${url}`;
      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push({ method: method.toUpperCase(), path: url, source: 'xhr' });
      }
    }
    return originalXHROpen.apply(this, arguments);
  };

  // 3. Scan for existing API documentation on the page
  const apiLinks = document.querySelectorAll('a[href*="/api"], a[href*="/docs"], a[href*="swagger"], a[href*="openapi"]');
  apiLinks.forEach(link => {
    const href = link.href;
    if (looksLikeAPI(href)) {
      const key = `GET:${href}`;
      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push({ method: 'GET', path: href, source: 'link' });
      }
    }
  });

  // 4. Scan for OpenAPI/Swagger spec links
  const specLinks = document.querySelectorAll('link[rel="alternate"][type*="json"], script[type*="application/json"]');
  specLinks.forEach(el => {
    const content = el.textContent || el.innerHTML;
    if (content && (content.includes('openapi') || content.includes('swagger'))) {
      try {
        const spec = JSON.parse(content);
        if (spec.paths) {
          Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.keys(methods).forEach(method => {
              const key = `${method.toUpperCase()}:${path}`;
              if (!seen.has(key)) {
                seen.add(key);
                endpoints.push({ method: method.toUpperCase(), path, source: 'spec' });
              }
            });
          });
        }
      } catch (e) {
        // Not valid JSON, skip
      }
    }
  });

  // 5. Scan for axios/fetch calls in script tags
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    // We can't read cross-origin scripts, but we can note their existence
    // In a real extension, we'd use the debugger API
  });

  // Wait a bit for async API calls to be captured
  setTimeout(() => {
    // Return captured endpoints
    window.__fastapiDocGenEndpoints = endpoints;
  }, 2000);

  return endpoints;
}

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
  const servers = [{ url: window.location.origin }];

  endpoints.forEach(ep => {
    const cleanPath = ep.path.replace(window.location.origin, '');
    if (!paths[cleanPath]) {
      paths[cleanPath] = {};
    }
    paths[cleanPath][ep.method.toLowerCase()] = {
      summary: `${ep.method} ${cleanPath}`,
      description: `Endpoint captured by FastAPI Doc Gen (${ep.source})`,
      responses: {
        '200': { description: 'Successful response' },
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
      title: `${window.document.title || 'API'} - Generated by FastAPI Doc Gen`,
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
function copyOutput() {
  const output = $('output').textContent;
  navigator.clipboard.writeText(output).then(() => {
    updateStatus('Copied to clipboard!', 'success');
  });
}

function downloadOutput() {
  const output = $('output').textContent;
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
  state.endpoints = [];
  $('capture-btn').disabled = true;
  $('generate-btn').disabled = true;
  updateStatus('Cleared', 'info');
}

// --- Persistence ---
function saveEndpoints(endpoints) {
  chrome.storage.local.set({ capturedEndpoints: endpoints });
}

function loadEndpoints() {
  chrome.storage.local.get(['capturedEndpoints'], (result) => {
    if (result.capturedEndpoints && result.capturedEndpoints.length > 0) {
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
    item.innerHTML = `
      <span class="endpoint-method method-${ep.method}">${ep.method}</span>
      <span class="endpoint-path" title="${ep.path}">${ep.path}</span>
    `;
    list.appendChild(item);
  });

  $('endpoints-section').classList.remove('hidden');
}
