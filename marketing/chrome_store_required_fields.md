# Chrome Web Store — Required Fields Checklist

## ✅ Already Done
- Extension ZIP uploaded
- Screenshots (1280x800 PNG/JPEG)
- Icon (128x128 PNG)

## ❌ Still Need to Fill In (Copy-Paste These)

### 1. Contact Email (Settings page)
Go to: **Settings → Publisher contact email**
- Enter your email address
- Click "Verify" (check your email for verification link)

### 2. Language
Go to: **Listing → Language**
- Select: **English**

### 3. Category
Go to: **Listing → Category**
- Select: **Developer tools**

### 4. Detailed Description (min 25 chars)
Go to: **Listing → Full description**
```
FastAPI Doc Gen is a Chrome extension that captures API endpoints from any web app and generates OpenAPI/Swagger specifications automatically. Perfect for developers who need to document APIs they build or integrate with. One-time $29 purchase, no subscription.
```

### 5. Single Purpose Description
Go to: **Privacy practices → Single purpose description**
```
FastAPI Doc Gen captures API endpoints from web pages and generates OpenAPI/Swagger specification files for developers.
```

### 6. Privacy Practices (justifications for each permission)

Go to: **Privacy practices → Privacy practices and permissions**

For each permission, enter the justification:

#### activeTab
```
Used to access the currently active browser tab to scan its web page for API endpoints (fetch/XHR calls, API documentation links, and embedded OpenAPI specs).
```

#### clipboardWrite
```
Used to copy the generated OpenAPI specification to the clipboard when the user clicks the "Copy" button in the popup.
```

#### scripting
```
Used to execute the API scanning script in the active tab to capture fetch/XHR calls and detect API endpoints on the page.
```

#### storage
```
Used to save captured endpoints and generated OpenAPI specifications locally in the browser so they persist between popup sessions.
```

#### host permission (<all_urls>)
```
Required to intercept fetch and XMLHttpRequest calls on any web page to capture API endpoints. The extension only reads API-related network requests and does not collect or transmit any personal data.
```

#### remote code use
```
This extension does not use remote code. All functionality is contained within the extension package. The extension does not load or execute any remote code or scripts.
```

### 7. Data Usage Certification
Go to: **Privacy practices → Data usage certification**
- Check: "I certify that my data usage complies with the Developer Program Policies"
- Check: "I certify that my item does not collect or transmit any personal or sensitive user data"

### 8. Screenshots
Go to: **Listing → Screenshots**
- Upload at least 1 screenshot (you have 3 + 1 promo image)
- Use: `screenshot1_main_popup.png` (or .jpg)

### 9. Icon
Go to: **Listing → Icon**
- Upload: `icon128_store.png` (128x128)

## Quick Order to Fill In

1. **Settings** → Add + verify contact email
2. **Privacy practices** → Fill in all justifications + single purpose + certification
3. **Listing** → Language (English) + Category (Developer tools) + Description + Screenshots + Icon
4. Click **Publish**

## All Justifications (Copy-Paste Friendly)

```
activeTab: Used to access the currently active browser tab to scan its web page for API endpoints (fetch/XHR calls, API documentation links, and embedded OpenAPI specs).

clipboardWrite: Used to copy the generated OpenAPI specification to the clipboard when the user clicks the "Copy" button in the popup.

scripting: Used to execute the API scanning script in the active tab to capture fetch/XHR calls and detect API endpoints on the page.

storage: Used to save captured endpoints and generated OpenAPI specifications locally in the browser so they persist between popup sessions.

host permission (<all_urls>): Required to intercept fetch and XMLHttpRequest calls on any web page to capture API endpoints. The extension only reads API-related network requests and does not collect or transmit any personal data.

remote code use: This extension does not use remote code. All functionality is contained within the extension package. The extension does not load or execute any remote code or scripts.

single purpose: FastAPI Doc Gen captures API endpoints from web pages and generates OpenAPI/Swagger specification files for developers.

data usage: This extension does not collect or transmit any personal or sensitive user data. All processing happens locally in the browser.
```
