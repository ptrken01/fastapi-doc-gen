// FastAPI Doc Gen — popup logic
// One-time purchase Chrome extension for developers

const state = {
  endpoints: [],
  isScanning: false,
  isGenerating: false,
  isPurchased: false
};

const $ = (id) => document.getElementById(id);

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Wire up buttons (always available for event binding)
  $('scan-btn').addEventListener('click', scanPage);
  $('capture-btn').addEventListener('click', captureEndpoints);
  $('generate-btn').addEventListener('click', generateOpenAPI);
  $('copy-btn').addEventListener('click', copyOutput);
  $('download-btn').addEventListener('click', downloadOutput);
  $('clear-btn').addEventListener('click', clearOutput);

  // 2. Check purchase status (REAL gate — blocks generate until purchased)
  await initPurchaseGate();

  // 3. Load saved endpoints
  loadEndpoints();
});

// --- Real purchase gate ---
async function initPurchaseGate() {
  updateStatus('Checking license…', 'info');
  let purchased = false;
  try {
    purchased = await window.FastAPIDocGenPay.checkPurchase();
  } catch (e) {
    purchased = false;
  }
  state.isPurchased = purchased;

  if (purchased) {
    updateStatus('✓ Premium version active', 'success');
    enableAllFeatures();
  } else {
    updateStatus('Free preview · ' + window.FastAPIDocGenConfig.PRICE_LABEL + ' one-time to unlock Generate', 'warning');
    showUpgradeBanner();
  }
}

function enableAllFeatures() {
  // Scan + capture always allowed; generate unlocked
  $('generate-btn').disabled = true; // enabled after capture
  const banner = $('upgrade-banner');
  if (banner) banner.classList.add('hidden');
}

function showUpgradeBanner() {
  let banner = $('upgrade-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'upgrade-banner';
    banner.className = 'upgrade-banner';
    banner.innerHTML = `
      <p><strong>Free preview:</strong> you can scan &amp; capture endpoints,
      but <strong>Generate OpenAPI</strong> is locked.</p>
      <button id="upgrade-btn" class="btn-upgrade">🔓 Unlock for ${window.FastAPIDocGenConfig.PRICE_LABEL} (one-time)</button>
      <p class="upgrade-fine">No subscription · Lifetime updates</p>`;
    $('app').insertBefore(banner, $('endpoints-section'));
    $('upgrade-btn').addEventListener('click', () => window.FastAPIDocGenPay.openPurchase());
  }
  banner.classList.remove('hidden');
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

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPageForAPIs,
      world: 'MAIN'
    });

    await new Promise(resolve => setTimeout(resolve, 2500));

    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__fastapiDocGenEndpoints || [],
      world: 'MAIN'
    });

    const results = response[0]?.result || [];

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
  if (window.__fastapiDocGenInjected) {
    return window.__fastapiDocGenEndpoints || [];
  }
  window.__fastapiDocGenInjected = true;
  window.__fastapiDocGenEndpoints = [];
  const seen = new Set();

  function looksLikeAPI(url) {
    try {
      const u = new URL(url, window.location.href);
      const path = u.pathname.toLowerCase();
      return path.includes('/api/') || path.includes('/v1/') || path.includes('/v2/') ||
             path.includes('/rest/') || path.includes('/graphql') ||
             u.hostname !== window.location.hostname;
    } catch { return false; }
  }

  function addEndpoint(method, url, source) {
    if (!url || !looksLikeAPI(url)) return;
    const key = `${method}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    window.__fastapiDocGenEndpoints.push({ method, path: url, source });
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    let url;
    if (typeof args[0] === 'string') url = args[0];
    else if (args[0] instanceof Request) url = args[0].url;
    else if (args[0] && typeof args[0] === 'object' && args[0].url) url = args[0].url;
    const method = (args[1]?.method || 'GET').toUpperCase();
    addEndpoint(method, url, 'fetch');
    return originalFetch.apply(this, args);
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    addEndpoint(method.toUpperCase(), url, 'xhr');
    return originalXHROpen.apply(this, arguments);
  };

  const apiLinks = document.querySelectorAll('a[href*="/api"], a[href*="/docs"], a[href*="swagger"], a[href*="openapi"]');
  apiLinks.forEach(link => addEndpoint('GET', link.href, 'link'));

  const specScripts = document.querySelectorAll('script[type*="application/json"]');
  specScripts.forEach(script => {
    try {
      const content = script.textContent;
      if (content && (content.includes('openapi') || content.includes('swagger'))) {
        const spec = JSON.parse(content);
        if (spec.paths) {
          Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.keys(methods).forEach(method => addEndpoint(method.toUpperCase(), path, 'spec'));
          });
        }
      }
    } catch (e) { /* not valid JSON */ }
  });

  if (window.axios && window.axios.defaults && window.axios.defaults.baseURL) {
    addEndpoint('GET', window.axios.defaults.baseURL, 'axios');
  }

  setTimeout(() => {}, 2000);
  return window.__fastapiDocGenEndpoints;
}

// --- Capture endpoints ---
function captureEndpoints() {
  if (state.endpoints.length === 0) return;
  saveEndpoints(state.endpoints);
  renderEndpoints(state.endpoints);
  // Generate is enabled only after purchase
  $('generate-btn').disabled = !state.isPurchased;
  updateStatus(`Captured ${state.endpoints.length} endpoints`, 'success');
}

// --- Generate OpenAPI spec (PAYWALED) ---
function generateOpenAPI() {
  if (!state.isPurchased) {
    showUpgradeBanner();
    updateStatus('Generate is locked — ' + window.FastAPIDocGenConfig.PRICE_LABEL + ' one-time to unlock', 'warning');
    window.FastAPIDocGenPay.openPurchase();
    return;
  }
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
  const origins = [...new Set(endpoints.map(ep => {
    try { return new URL(ep.path, window.location.href).origin; }
    catch { return window.location.origin; }
  }))];
  const servers = origins.map(origin => ({ url: origin }));

  endpoints.forEach(ep => {
    let cleanPath;
    try {
      const url = new URL(ep.path, window.location.href);
      cleanPath = url.pathname + url.search + url.hash;
    } catch { cleanPath = ep.path; }

    if (!paths[cleanPath]) paths[cleanPath] = {};
    const method = ep.method.toLowerCase();
    if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(method)) return;

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
      contact: { name: 'FastAPI Doc Gen', url: 'https://github.com/ptrken01/fastapi-doc-gen' }
    },
    servers: servers,
    paths: paths,
    components: { schemas: { Error: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } } } }
  };
}

function renderEndpoints(endpoints) {
  const list = $('endpoints-list');
  const empty = $('endpoints-empty');
  list.innerHTML = '';
  if (endpoints.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  endpoints.forEach(ep => {
    const div = document.createElement('div');
    div.className = 'endpoint-item';
    div.innerHTML = `<span class="method method-${ep.method.toLowerCase()}">${ep.method}</span> <span class="ep-path"></span>`;
    div.querySelector('.ep-path').textContent = ep.path;
    list.appendChild(div);
  });
}

function saveEndpoints(endpoints) {
  try { chrome.storage.local.set({ capturedEndpoints: endpoints }); } catch (e) {}
}

function loadEndpoints() {
  try {
    chrome.storage.local.get(['capturedEndpoints'], (result) => {
      if (result.capturedEndpoints && result.capturedEndpoints.length) {
        state.endpoints = result.capturedEndpoints;
        renderEndpoints(state.endpoints);
        $('capture-btn').disabled = false;
        $('generate-btn').disabled = !state.isPurchased;
      }
    });
  } catch (e) {}
}

function clearOutput() {
  state.endpoints = [];
  $('output').textContent = '';
  $('output-section').classList.add('hidden');
  $('endpoints-list').innerHTML = '';
  $('endpoints-empty').classList.remove('hidden');
  $('capture-btn').disabled = true;
  $('generate-btn').disabled = !state.isPurchased;
  try { chrome.storage.local.remove(['capturedEndpoints']); } catch (e) {}
  updateStatus('Cleared', 'info');
}

// --- BUG FIX #3: clipboard fallback for non-secure contexts ---
function copyOutput() {
  const text = $('output').textContent;
  if (!text) return;
  if (window.isSecureContext && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => updateStatus('Copied to clipboard', 'success'),
      () => fallbackCopy(text)
    );
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); updateStatus('Copied to clipboard', 'success'); }
  catch (e) { updateStatus('Copy failed', 'error'); }
  document.body.removeChild(ta);
}

function downloadOutput() {
  const text = $('output').textContent;
  if (!text) return;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'openapi-spec.json';
  a.click();
  URL.revokeObjectURL(url);
  updateStatus('Downloaded openapi-spec.json', 'success');
}
