#!/usr/bin/env python3
"""
Generate screenshots and icon for FastAPI Doc Gen Chrome extension.
Creates:
1. Chrome Web Store icon (128x128)
2. Screenshot 1: Main popup with scan button
3. Screenshot 2: Captured endpoints list
4. Screenshot 3: Generated OpenAPI spec
5. Promotional image (440x280)
"""
import os, struct, zlib, base64, io

HERE = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.join(HERE, "icons")
SCREENSHOT_DIR = os.path.join(HERE, "marketing", "screenshots")

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# --- SVG to PNG converter (simple, no external deps) ---
def svg_to_png(svg_content, width, height, output_path):
    """Create a PNG from SVG content using Python's built-in libraries."""
    # For simplicity, we'll create PNG files directly
    # In production, use cairosvg or similar
    pass

# --- Create PNG files directly ---
def create_png(width, height, pixels, output_path):
    """Create a PNG file from raw pixel data (list of (r,g,b) tuples)."""
    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += bytes([r, g, b])
    
    idat = zlib.compress(raw)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f"Created {output_path} ({width}x{height}, {len(png)} bytes)")

def create_gradient_png(width, height, start_color, end_color, output_path, text=None, text_color=(255, 255, 255)):
    """Create a gradient PNG with optional text."""
    pixels = []
    for y in range(height):
        for x in range(width):
            t = y / max(height - 1, 1)
            r = int(start_color[0] * (1 - t) + end_color[0] * t)
            g = int(start_color[1] * (1 - t) + end_color[1] * t)
            b = int(start_color[2] * (1 - t) + end_color[2] * t)
            pixels.append((r, g, b))
    
    create_png(width, height, pixels, output_path)
    
    if text:
        # We can't easily add text to raw PNG, so we'll create SVG instead
        pass

def create_svg(width, height, bg_color, elements, output_path):
    """Create an SVG file with the given elements."""
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <rect width="{width}" height="{height}" fill="{bg_color}" rx="8"/>
{elements}
</svg>'''
    with open(output_path, 'w') as f:
        f.write(svg)
    print(f"Created {output_path} ({width}x{height})")

# --- Icon (128x128) ---
def create_icon():
    """Create a professional icon for the extension."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0f1117"/>
  <rect x="24" y="24" width="80" height="80" rx="16" fill="#1a1d24" stroke="#3b82f6" stroke-width="2"/>
  <!-- Document icon -->
  <rect x="44" y="38" width="40" height="50" rx="4" fill="#0f1117"/>
  <line x1="44" y1="52" x2="84" y2="52" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
  <line x1="44" y1="64" x2="76" y2="64" stroke="#8b8f96" stroke-width="2" stroke-linecap="round"/>
  <line x1="44" y1="76" x2="84" y2="76" stroke="#8b8f96" stroke-width="2" stroke-linecap="round"/>
  <line x1="44" y1="88" x2="68" y2="88" stroke="#8b8f96" stroke-width="2" stroke-linecap="round"/>
  <!-- API tag -->
  <circle cx="92" cy="48" r="8" fill="#22c55e"/>
  <text x="92" y="52" font-family="monospace" font-size="8" fill="white" text-anchor="middle" font-weight="bold">API</text>
  <!-- Bracket -->
  <path d="M 36 100 Q 48 110 64 100 Q 80 90 92 100" fill="none" stroke="#3b82f6" stroke-width="2"/>
</svg>'''
    path = os.path.join(ICON_DIR, "icon128_store.svg")
    with open(path, 'w') as f:
        f.write(svg)
    print(f"Created {path}")
    
    # Also create PNG version
    pixels = []
    for y in range(128):
        for x in range(128):
            if x < 24 or x > 104 or y < 24 or y > 104:
                # Border
                if 24 <= x <= 104 and 24 <= y <= 104:
                    r, g, b = 15, 17, 23  # dark background
                else:
                    r, g, b = 15, 17, 23
            elif 44 <= x <= 84 and 38 <= y <= 88:
                # Document area
                if 44 <= x <= 84 and 48 <= y <= 52:
                    r, g, b = 59, 130, 246  # blue line
                elif 44 <= x <= 76 and 64 <= y <= 68:
                    r, g, b = 139, 143, 150  # gray line
                elif 44 <= x <= 84 and 76 <= y <= 80:
                    r, g, b = 139, 143, 150
                elif 44 <= x <= 68 and 88 <= y <= 92:
                    r, g, b = 139, 143, 150
                else:
                    r, g, b = 15, 17, 23  # document bg
            elif 84 <= x <= 100 and 40 <= y <= 56:
                # API tag
                dx, dy = x - 92, y - 48
                if dx*dx + dy*dy <= 64:
                    r, g, b = 34, 197, 94  # green circle
                else:
                    r, g, b = 15, 17, 23
            else:
                r, g, b = 26, 29, 36  # card bg
            
            pixels.append((r, g, b))
    
    create_png(128, 128, pixels, os.path.join(ICON_DIR, "icon128_store.png"))

# --- Screenshots ---
def create_screenshot_1():
    """Screenshot 1: Main popup with scan button."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
  <rect width="440" height="280" rx="12" fill="#0f1117"/>
  <!-- Browser chrome -->
  <rect y="0" width="440" height="32" fill="#2d3139"/>
  <circle cx="16" cy="16" r="6" fill="#f59e0b"/>
  <circle cx="40" cy="16" r="6" fill="#ef4444"/>
  <circle cx="64" cy="16" r="6" fill="#22c55e"/>
  <!-- Extension popup -->
  <rect x="40" y="40" width="360" height="220" rx="8" fill="#1a1d24" stroke="#2d3139" stroke-width="1"/>
  <!-- Popup header -->
  <text x="60" y="68" font-family="monospace" font-size="14" fill="#ffffff" font-weight="600">FastAPI Doc Gen</text>
  <text x="60" y="84" font-family="monospace" font-size="11" fill="#8b8f96">Capture APIs → Generate OpenAPI specs</text>
  <!-- Status -->
  <rect x="60" y="96" width="340" height="24" rx="4" fill="#0f1117" stroke="#2d3139"/>
  <circle cx="72" cy="108" r="4" fill="#22c55e"/>
  <text x="80" y="112" font-family="monospace" font-size="11" fill="#22c55e">Ready to scan (demo mode)</text>
  <!-- Buttons -->
  <rect x="60" y="132" width="340" height="36" rx="6" fill="#3b82f6"/>
  <text x="230" y="158" font-family="monospace" font-size="12" fill="white" text-anchor="middle">🔍 Scan Page for APIs</text>
  <rect x="60" y="176" width="340" height="36" rx="6" fill="#2d3139"/>
  <text x="230" y="202" font-family="monospace" font-size="12" fill="#8b8f96" text-anchor="middle">📋 Capture Endpoints</text>
  <rect x="60" y="220" width="340" height="36" rx="6" fill="#22c55e"/>
  <text x="230" y="246" font-family="monospace" font-size="12" fill="#0f1117" text-anchor="middle">⚡ Generate OpenAPI</text>
  <!-- Footer -->
  <text x="220" y="270" font-family="monospace" font-size="9" fill="#8b8f96" text-anchor="middle">v1.0.0 · One-time purchase</text>
</svg>'''
    path = os.path.join(SCREENSHOT_DIR, "screenshot1_main_popup.svg")
    with open(path, 'w') as f:
        f.write(svg)
    print(f"Created {path}")

def create_screenshot_2():
    """Screenshot 2: Captured endpoints list."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
  <rect width="440" height="280" rx="12" fill="#0f1117"/>
  <!-- Browser chrome -->
  <rect y="0" width="440" height="32" fill="#2d3139"/>
  <circle cx="16" cy="16" r="6" fill="#f59e0b"/>
  <circle cx="40" cy="16" r="6" fill="#ef4444"/>
  <circle cx="64" cy="16" r="6" fill="#22c55e"/>
  <!-- Extension popup -->
  <rect x="40" y="40" width="360" height="220" rx="8" fill="#1a1d24" stroke="#2d3139" stroke-width="1"/>
  <!-- Header -->
  <text x="60" y="68" font-family="monospace" font-size="14" fill="#ffffff" font-weight="600">FastAPI Doc Gen</text>
  <text x="60" y="84" font-family="monospace" font-size="11" fill="#8b8f96">Capture APIs → Generate OpenAPI specs</text>
  <!-- Section header -->
  <text x="60" y="108" font-family="monospace" font-size="12" fill="#ffffff" font-weight="600">Captured Endpoints</text>
  <!-- Endpoint items -->
  <rect x="60" y="120" width="340" height="28" rx="4" fill="#0f1117"/>
  <text x="72" y="138" font-family="monospace" font-size="11" fill="#3b82f6" font-weight="700">GET</text>
  <text x="100" y="138" font-family="monospace" font-size="10" fill="#cbd5e1">https://api.example.com/v1/users</text>
  <rect x="60" y="152" width="340" height="28" rx="4" fill="#0f1117"/>
  <text x="72" y="170" font-family="monospace" font-size="11" color="#22c55e" font-weight="700">POST</text>
  <text x="100" y="170" font-family="monospace" font-size="10" fill="#cbd5e1">https://api.example.com/v1/users</text>
  <rect x="60" y="184" width="340" height="28" rx="4" fill="#0f1117"/>
  <text x="72" y="202" font-family="monospace" font-size="11" fill="#f59e0b" font-weight="700">GET</text>
  <text x="100" y="202" font-family="monospace" font-size="10" fill="#cbd5e1">https://api.example.com/v1/users/123</text>
  <!-- Generate button -->
  <rect x="60" y="224" width="340" height="32" rx="6" fill="#22c55e"/>
  <text x="230" y="246" font-family="monospace" font-size="12" fill="#0f1117" text-anchor="middle">⚡ Generate OpenAPI</text>
</svg>'''
    path = os.path.join(SCREENSHOT_DIR, "screenshot2_endpoints.svg")
    with open(path, 'w') as f:
        f.write(svg)
    print(f"Created {path}")

def create_screenshot_3():
    """Screenshot 3: Generated OpenAPI spec."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
  <rect width="440" height="280" rx="12" fill="#0f1117"/>
  <!-- Browser chrome -->
  <rect y="0" width="440" height="32" fill="#2d3139"/>
  <circle cx="16" cy="16" r="6" fill="#f59e0b"/>
  <circle cx="40" cy="16" r="6" fill="#ef4444"/>
  <circle cx="64" cy="16" r="6" fill="#22c55e"/>
  <!-- Extension popup -->
  <rect x="40" y="40" width="360" height="220" rx="8" fill="#1a1d24" stroke="#2d3139" stroke-width="1"/>
  <!-- Header -->
  <text x="60" y="68" font-family="monospace" font-size="14" fill="#ffffff" font-weight="600">FastAPI Doc Gen</text>
  <text x="60" y="84" font-family="monospace" font-size="11" fill="#8b8f96">Capture APIs → Generate OpenAPI specs</text>
  <!-- Section header -->
  <text x="60" y="108" font-family="monospace" font-size="12" fill="#ffffff" font-weight="600">Generated Spec</text>
  <!-- Output area -->
  <rect x="60" y="120" width="340" height="140" rx="4" fill="#0f1117" stroke="#2d3139"/>
  <text x="72" y="140" font-family="monospace" font-size="9" fill="#22c55e">{"openapi": "3.0.3",</text>
  <text x="72" y="154" font-family="monospace" font-size="9" fill="#22c55e">"info": {"text x="72" y="168" font-family="monospace" font-size="9" fill="#22c55e">  "title": "Example API - Generated by FastAPI Doc Gen",</text>
  <text x="72" y="182" font-family="monospace" font-size="9" fill="#22c55e">  "version": "1.0.0"</text>
  <text x="72" y="196" font-family="monospace" font-size="9" fill="#22c55e">},</text>
  <text x="72" y="210" font-family="monospace" font-size="9" fill="#22c55e">"paths": {</text>
  <text x="72" y="224" font-family="monospace" font-size="9" fill="#22c55e">  "/v1/users": {"text x="72" y="238" font-family="monospace" font-size="9" fill="#22c55e">    "get": {"text x="72" y="252" font-family="monospace" font-size="9" fill="#22c55e">      "summary": "GET /v1/users"</text>
  <!-- Buttons -->
  <rect x="60" y="224" width="80" height="24" rx="4" fill="#2d3139"/>
  <text x="100" y="240" font-family="monospace" font-size="10" fill="#e4e6eb" text-anchor="middle">📋 Copy</text>
  <rect x="152" y="224" width="80" height="24" rx="4" fill="#2d3139"/>
  <text x="192" y="240" font-family="monospace" font-size="10" fill="#e4e6eb" text-anchor="middle">💾 Download</text>
  <rect x="244" y="224" width="80" height="24" rx="4" fill="#2d3139"/>
  <text x="284" y="240" font-family="monospace" font-size="10" fill="#e4e6eb" text-anchor="middle">🗑️ Clear</text>
</svg>'''
    path = os.path.join(SCREENSHOT_DIR, "screenshot3_openapi.svg")
    with open(path, 'w') as f:
        f.write(svg)
    print(f"Created {path}")

def create_promo_image():
    """Create 440x280 promotional image."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
  <rect width="440" height="280" rx="12" fill="#0f1117"/>
  <!-- Gradient overlay -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1d24"/>
      <stop offset="100%" stop-color="#0f1117"/>
    </linearGradient>
  </defs>
  <rect width="440" height="280" rx="12" fill="url(#grad)"/>
  <!-- Icon -->
  <rect x="160" y="40" width="120" height="120" rx="24" fill="#1a1d24" stroke="#3b82f6" stroke-width="2"/>
  <rect x="200" y="60" width="40" height="80" rx="4" fill="#0f1117"/>
  <line x1="200" y1="76" x2="240" y2="76" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
  <line x1="200" y1="92" x2="232" y2="92" stroke="#8b8f96" stroke-width="2" stroke-linecap="round"/>
  <line x1="200" y1="108" x2="240" y2="108" stroke="#8b8f96" stroke-width="2" stroke-linecap="round"/>
  <circle cx="252" cy="80" r="8" fill="#22c55e"/>
  <text x="252" y="84" font-family="monospace" font-size="8" fill="white" text-anchor="middle" font-weight="bold">API</text>
  <!-- Title -->
  <text x="220" y="180" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="middle" font-weight="600">FastAPI Doc Gen</text>
  <text x="220" y="200" font-family="monospace" font-size="12" fill="#8b8f96" text-anchor="middle">Generate OpenAPI specs from any web app</text>
  <!-- Price -->
  <rect x="140" y="216" width="160" height="32" rx="16" fill="#22c55e"/>
  <text x="220" y="236" font-family="monospace" font-size="14" fill="#0f1117" text-anchor="middle" font-weight="600">$29 one-time</text>
  <!-- Features -->
  <text x="220" y="260" font-family="monospace" font-size="10" fill="#8b8f96" text-anchor="middle">No subscription · No server · Lifetime updates</text>
</svg>'''
    path = os.path.join(SCREENSHOT_DIR, "promo_image.svg")
    with open(path, 'w') as f:
        f.write(svg)
    print(f"Created {path}")

if __name__ == "__main__":
    print("=" * 60)
    print("FastAPI Doc Gen — Asset Generator")
    print("=" * 60)
    
    create_icon()
    create_screenshot_1()
    create_screenshot_2()
    create_screenshot_3()
    create_promo_image()
    
    print("-" * 60)
    print(f"Assets created in:")
    print(f"  Icons: {ICON_DIR}/")
    print(f"  Screenshots: {SCREENSHOT_DIR}/")
    print("-" * 60)
    print("Note: SVG files can be converted to PNG using:")
    print("  - Online converters (svg2png.com)")
    print("  - Inkscape: inkscape --export-type=png input.svg")
    print("  - ImageMagick: convert input.svg output.png")
