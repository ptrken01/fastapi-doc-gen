# FastAPI Doc Gen

**A one-time purchase Chrome extension for developers that captures API endpoints from any web app and generates OpenAPI/Swagger documentation.**

> **No subscription. No recurring fees. One payment, lifetime updates.**

## What It Does

FastAPI Doc Gen sits in your browser toolbar and automatically detects API calls on any web page you visit. It captures:

- **Fetch API calls** — intercepts all `fetch()` requests
- **XHR requests** — intercepts all `XMLHttpRequest` calls  
- **API documentation links** — finds `/api/`, `/docs`, Swagger/OpenAPI links
- **Embedded specs** — detects OpenAPI/Swagger JSON in `<script>` tags
- **Axios instances** — detects axios base URLs

Then it generates a complete **OpenAPI 3.0.3 specification** that you can:

- Copy to clipboard
- Download as `openapi.json`
- Use to generate client SDKs, server stubs, or documentation

## Why This Makes Money

Chrome extensions with one-time purchases have proven revenue:

| Extension | Price | Revenue |
|---|---|---|
| CSS Scan | $69 one-time | $100K+ |
| Spider | $38 one-time | $10K in 2 months |
| GoFullPage | $1/month | $10K/month |

**FastAPI Doc Gen** targets developers who need to document APIs they're building or consuming. The one-time purchase model means:
- No churn
- No billing infrastructure
- No customer support for failed payments
- Lifetime value per customer

## Installation (Development)

```bash
# Clone the repo
git clone https://github.com/ptrken01/fastapi-doc-gen.git
cd fastapi-doc-gen

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select this folder
```

## Pricing

- **One-time purchase: $29** (via ExtensionPay)
- Includes all future updates
- 30-day money-back guarantee

## Monetization

Uses [ExtensionPay](https://extensionpay.com) for:
- One-time purchase processing
- License verification
- No server infrastructure needed

## Tech Stack

- **Manifest V3** Chrome Extension
- **Vanilla JavaScript** (no frameworks)
- **ExtensionPay** for payments
- **Chrome Storage API** for persistence

## Files

```
fastapi-doc-gen/
├── manifest.json          # Extension manifest
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   ├── popup.js           # Popup logic
│   └── extensionpay.js    # ExtensionPay integration
├── content/
│   ├── content.js         # Content script (API capture)
│   └── content.css        # Content script styles
├── background/
│   └── background.js      # Background service worker
├── options/
│   └── options.html       # Options page
└── icons/                 # Extension icons
```

## How to Publish

1. Create an ExtensionPay account at [extensionpay.com](https://extensionpay.com)
2. Create a new extension with ID `fastapi-doc-gen`
3. Set price to $29 one-time
4. Zip the folder and upload to Chrome Web Store
5. Set Chrome Web Store listing price to $29

## License

MIT — but the extension itself is a paid product. The source is available for learning purposes.
