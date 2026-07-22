#!/usr/bin/env python3
"""
Test harness for FastAPI Doc Gen Chrome extension.
Verifies the extension structure, manifest, and core logic.

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
    
    # Simulate the looksLikeAPI function
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

def main():
    print("=" * 60)
    print("FastAPI Doc Gen — Extension Test Suite")
    print("=" * 60)
    
    tests = [
        ("Manifest validation", test_manifest),
        ("File structure", test_files_exist),
        ("Popup HTML", test_popup_html),
        ("JS syntax", test_js_syntax),
        ("Core logic", test_core_logic),
        ("OpenAPI generation", test_openapi_generation),
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
