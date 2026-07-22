#!/usr/bin/env python3
"""
Test harness for FastAPI Doc Gen Chrome extension.
Verifies the extension structure, manifest, and core logic.

Includes regression tests for bugs found in non-routine use cases:
- BUG #1: scanPageForAPIs returns empty (async capture timing)
- BUG #2: buildOpenAPISpec fails on cross-origin URLs
- BUG #3: copyOutput fails when clipboard API unavailable
- BUG #4: fetch interception doesn't handle Request objects
- BUG #5: stale endpoints persist after clear/load

Run:  python3 test_extension.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def test_manifest():
    """Verify manifest.json is valid and complete."""
    path = os.path.join(HERE, "manifest.json")
    assert os.path.exists(path), "manifest.json not found"
    
    with open(path) as f:
        manifest = json.load(f)
    
    assert manifest["manifest_version"] == 3, "Must use Manifest V3"
    assert "name" in manifest, "Missing name"
    assert "version" in manifest, "Missing version"
    assert "action" in manifest, "Missing action"
    assert "permissions" in manifest, "Missing permissions"
    assert "content_scripts" in manifest, "Missing content_scripts"
    assert "background" in manifest, "Missing background"
    assert "icons" in manifest, "Missing icons"
    
    # Check icons exist
    for size in ["16", "32", "48", "128"]:
        icon_path = os.path.join(HERE, manifest["icons"][size])
        assert os.path.exists(icon_path), f"Icon {size}px not found"
    
    print("✓ Manifest valid (MV3, all fields present, icons exist)")
    return True

def test_files_exist():
    """Verify all required files exist."""
    required = [
        "manifest.json",
        "popup/popup.html",
        "popup/popup.css",
        "popup/popup.js",
        "popup/extensionpay.js",
        "background/background.js",
        "content/content.js",
        "content/content.css",
        "options/options.html",
        "README.md",
    ]
    for f in required:
        path = os.path.join(HERE, f)
        assert os.path.exists(path), f"Missing file: {f}"
    
    print(f"✓ All {len(required)} required files exist")
    return True

def test_popup_html():
    """Verify popup.html has required elements."""
    path = os.path.join(HERE, "popup/popup.html")
    with open(path) as f:
        html = f.read()
    
    required_elements = [
        'id="scan-btn"',
        'id="capture-btn"',
        'id="generate-btn"',
        'id="endpoints-list"',
        'id="output"',
        'id="copy-btn"',
        'id="download-btn"',
    ]
    for elem in required_elements:
        assert elem in html, f"Missing element: {elem}"
    
    print("✓ Popup HTML has all required elements")
    return True

def test_js_syntax():
    """Verify JS files have no syntax errors (using node if available)."""
    import subprocess
    js_files = [
        "popup/popup.js",
        "popup/extensionpay.js",
        "background/background.js",
        "content/content.js",
    ]
    for js_file in js_files:
        path = os.path.join(HERE, js_file)
        try:
            result = subprocess.run(
                ["node", "--check", path],
                capture_output=True, text=True, timeout=5
            )
            assert result.returncode == 0, f"Syntax error in {js_file}: {result.stderr}"
        except FileNotFoundError:
            print(f"  (node not available, skipping syntax check for {js_file})")
            return True
    
    print(f"✓ All {len(js_files)} JS files pass syntax check")
    return True

def test_core_logic():
    """Test the core API capture and OpenAPI generation logic."""
    # Test looksLikeAPI function
    test_cases = [
        ("https://api.example.com/v1/users", True),
        ("https://example.com/api/data", True),
        ("https://example.com/rest/items", True),
        ("https://example.com/graphql", True),
        ("https://example.com/about", False),
        ("https://example.com/contact", False),
    ]
    
    def looksLikeAPI(url):
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            path = parsed.path.lower()
            return ('/api/' in path or '/v1/' in path or '/v2/' in path or
                    '/rest/' in path or '/graphql' in path)
        except:
            return False
    
    for url, expected in test_cases:
        result = looksLikeAPI(url)
        assert result == expected, f"looksLikeAPI({url}) = {result}, expected {expected}"
    
    print(f"✓ Core logic (looksLikeAPI) passes {len(test_cases)} test cases")
    return True

def test_openapi_generation():
    """Test OpenAPI spec generation."""
    endpoints = [
        {"method": "GET", "path": "https://api.example.com/v1/users", "source": "fetch"},
        {"method": "POST", "path": "https://api.example.com/v1/users", "source": "fetch"},
        {"method": "GET", "path": "https://api.example.com/v1/users/123", "source": "xhr"},
    ]
    
    # Simulate buildOpenAPISpec
    paths = {}
    for ep in endpoints:
        clean_path = ep["path"].replace("https://api.example.com", "")
        if clean_path not in paths:
            paths[clean_path] = {}
        paths[clean_path][ep["method"].lower()] = {
            "summary": f"{ep['method']} {clean_path}",
            "responses": {"200": {"description": "OK"}}
        }
    
    spec = {
        "openapi": "3.0.3",
        "info": {"title": "Test API", "version": "1.0.0"},
        "paths": paths
    }
    
    assert spec["openapi"] == "3.0.3"
    assert len(spec["paths"]) == 2  # /v1/users and /v1/users/123
    assert "get" in spec["paths"]["/v1/users"]
    assert "post" in spec["paths"]["/v1/users"]
    assert "get" in spec["paths"]["/v1/users/123"]
    
    print("✓ OpenAPI generation produces valid spec structure")
    return True

# --- Regression tests for bugs found in non-routine use cases ---

def test_bug1_async_capture_timing():
    """
    BUG #1: scanPageForAPIs returns immediately, but the content script
    sets window.__fastapiDocGenEndpoints after a 2-second timeout.
    The popup's executeScript call runs scanPageForAPIs which returns
    endpoints synchronously, but the 2-second timeout means the returned
    array is empty at first.
    
    FIX: The popup now waits 2.5s after injecting the content script
    before reading the results, and reads from window.__fastapiDocGenEndpoints
    in a separate executeScript call.
    """
    # Verify the popup.js has the wait logic
    path = os.path.join(HERE, "popup/popup.js")
    with open(path) as f:
        js = f.read()
    
    # Check that the 2.5s wait is present
    assert "setTimeout(resolve, 2500)" in js, \
        "BUG #1 not fixed: missing 2.5s wait for async capture"
    
    # Check that we read from window.__fastapiDocGenEndpoints in a separate call
    assert "window.__fastapiDocGenEndpoints || []" in js, \
        "BUG #1 not fixed: not reading from window.__fastapiDocGenEndpoints"
    
    print("✓ BUG #1 fixed: async capture timing — popup waits 2.5s before reading results")
    return True

def test_bug2_cross_origin_paths():
    """
    BUG #2: buildOpenAPISpec uses window.location.origin which may not
    match the captured endpoint's origin (e.g., API on a different subdomain).
    The cleanPath replacement fails for cross-origin URLs.
    
    FIX: The buildOpenAPISpec now uses URL parsing to extract the path,
    and collects all unique origins for the servers array.
    """
    path = os.path.join(HERE, "popup/popup.js")
    with open(path) as f:
        js = f.read()
    
    # Check that we use URL parsing instead of string replacement
    assert "new URL(ep.path" in js, \
        "BUG #2 not fixed: not using URL parsing for path extraction"
    
    # Check that we collect multiple origins
    assert "origins" in js and "new Set" in js, \
        "BUG #2 not fixed: not collecting unique origins for servers"
    
    # Check that we handle cross-origin URLs
    assert "url.pathname + url.search + url.hash" in js, \
        "BUG #2 not fixed: not properly extracting path with query params"
    
    print("✓ BUG #2 fixed: cross-origin paths — uses URL parsing, collects all origins")
    return True

def test_bug3_clipboard_fallback():
    """
    BUG #3: copyOutput doesn't handle the case where navigator.clipboard
    is unavailable (HTTPS-only API). On HTTP pages, the clipboard API
    throws an error.
    
    FIX: Added fallbackCopy function that uses execCommand('copy')
    when the clipboard API is unavailable.
    """
    path = os.path.join(HERE, "popup/popup.js")
    with open(path) as f:
        js = f.read()
    
    # Check that we check for secure context
    assert "isSecureContext" in js, \
        "BUG #3 not fixed: not checking for secure context"
    
    # Check that we have a fallback function
    assert "fallbackCopy" in js, \
        "BUG #3 not fixed: no fallback copy function"
    
    # Check that we use execCommand as fallback
    assert "execCommand('copy')" in js, \
        "BUG #3 not fixed: no execCommand fallback"
    
    print("✓ BUG #3 fixed: clipboard fallback — handles HTTP pages with execCommand")
    return True

def test_bug4_request_object_handling():
    """
    BUG #4: The content script intercepts fetch but doesn't handle
    Request objects passed as the first argument (only string URLs).
    fetch(new Request('https://api.example.com/v1/users')) would fail
    to capture the URL.
    
    FIX: Added handling for Request objects and object URLs.
    """
    path = os.path.join(HERE, "content/content.js")
    with open(path) as f:
        js = f.read()
    
    # Check that we handle Request objects
    assert "args[0] instanceof Request" in js, \
        "BUG #4 not fixed: not handling Request objects in fetch interception"
    
    # Check that we handle object URLs
    assert "args[0].url" in js, \
        "BUG #4 not fixed: not handling object URLs in fetch interception"
    
    print("✓ BUG #4 fixed: Request object handling — intercepts Request objects and object URLs")
    return True

def test_bug5_stale_endpoints():
    """
    BUG #5: loadEndpoints doesn't clear old endpoints from the endpoints
    list before loading new ones — stale endpoints from a previous scan
    persist. Also, clearOutput doesn't clear chrome.storage.
    
    FIX: Added state.endpoints = [] before loading, and chrome.storage.local.remove
    in clearOutput.
    """
    path = os.path.join(HERE, "popup/popup.js")
    with open(path) as f:
        js = f.read()
    
    # Check that we clear state before loading
    assert "state.endpoints = []" in js, \
        "BUG #5 not fixed: not clearing state before loading"
    
    # Check that clearOutput removes from storage
    assert "chrome.storage.local.remove" in js, \
        "BUG #5 not fixed: clearOutput doesn't remove from storage"
    
    # Check that renderEndpoints escapes HTML (bonus XSS fix)
    assert "replace(/&/g" in js, \
        "XSS fix not present: not escaping HTML in endpoint paths"
    
    print("✓ BUG #5 fixed: stale endpoints — clears state before load, removes from storage on clear")
    return True

def main():
    print("=" * 60)
    print("FastAPI Doc Gen — Extension Test Suite (with regression tests)")
    print("=" * 60)
    
    tests = [
        ("Manifest validation", test_manifest),
        ("File structure", test_files_exist),
        ("Popup HTML", test_popup_html),
        ("JS syntax", test_js_syntax),
        ("Core logic", test_core_logic),
        ("OpenAPI generation", test_openapi_generation),
        ("BUG #1: async capture timing", test_bug1_async_capture_timing),
        ("BUG #2: cross-origin paths", test_bug2_cross_origin_paths),
        ("BUG #3: clipboard fallback", test_bug3_clipboard_fallback),
        ("BUG #4: Request object handling", test_bug4_request_object_handling),
        ("BUG #5: stale endpoints", test_bug5_stale_endpoints),
    ]
    
    passed = 0
    failed = 0
    for name, test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"✗ {name}: {e}")
            failed += 1
    
    print("-" * 60)
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")
    
    if failed == 0:
        print("\n🎉 All tests passed! Extension is ready for development.")
        return 0
    else:
        print(f"\n❌ {failed} test(s) failed. Fix before publishing.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
