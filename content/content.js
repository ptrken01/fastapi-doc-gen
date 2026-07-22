// FastAPI Doc Gen — content script
// Runs in page context to capture API calls

(function() {
  'use strict';

  // Don't run twice
  if (window.__fastapiDocGenInjected) return;
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

  // 1. Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
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

  // 3. Scan for existing API links on page load
  function scanPage() {
    // API documentation links
    const apiLinks = document.querySelectorAll('a[href*="/api"], a[href*="/docs"], a[href*="swagger"], a[href*="openapi"]');
    apiLinks.forEach(link => addEndpoint('GET', link.href, 'link'));

    // OpenAPI/Swagger spec in script tags
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

    // Axios instance detection (if present)
    if (window.axios) {
      const originalAxios = window.axios;
      if (originalAxios.defaults && originalAxios.defaults.baseURL) {
        addEndpoint('GET', originalAxios.defaults.baseURL, 'axios');
      }
    }
  }

  // Scan on load and after a delay for dynamic content
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPage);
  } else {
    scanPage();
  }

  // Also scan after a delay for SPA content
  setTimeout(scanPage, 1000);
})();
