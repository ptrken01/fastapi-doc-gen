# Chrome Web Store — Required Fields Checklist

## ✅ Already Done
- Extension ZIP uploaded (v1.0.1, paywall wired)
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
Used to save captured endpoints locally in your browser so they persist between popup sessions.
```

#### remote code use
```
This extension loads ExtensionPay's payment script (https://extensionpay.com/extended.js) at runtime to process one-time purchases and verify license status. This is the only remotely-hosted code; all other functionality is contained in the extension package.
```

**IMPORTANT:** There is NO "host permission" justification anymore — the manifest no longer declares `<all_urls>` (removed to avoid the broad-host-permission review delay). Do not add one.

### 7. Data Usage Certification
Go to: **Privacy practices → Data usage certification**
- Check: "I certify that my data usage complies with the Developer Program Policies"
- Check: "I certify that my item does not collect or transmit any personal or sensitive user data"

**Note on the Data Usage form (the checklist of data categories):**
Leave ALL boxes UNCHECKED. The extension itself collects no user data — all processing is local. ExtensionPay (payment processor) handles payment data separately under its own policy; that is not collected by this extension.

### 8. Screenshots
Go to: **Listing → Screenshots**
- Upload at least 1 screenshot (you have 3 + 1 promo image)
- Use: `screenshot1_main_popup.png` (or .jpg)

### 9. Icon
Go to: **Listing → Icon**
- Upload: `icon128_store.png` (128x128)

## Quick Order to Fill In

1. **Settings** → Add + verify contact email
2. **Privacy practices** → Fill in all justifications (activeTab, clipboardWrite, scripting, storage, remote code) + single purpose + certification
3. **Listing** → Language (English) + Category (Developer tools) + Description + Screenshots + Icon
4. Click **Publish**

## All Justifications (Copy-Paste Friendly)

```
activeTab: Used to access the currently active browser tab to scan its web page for API endpoints (fetch/XHR calls, API documentation links, and embedded OpenAPI specs).

clipboardWrite: Used to copy the generated OpenAPI specification to the clipboard when the user clicks the "Copy" button in the popup.

scripting: Used to execute the API scanning script in the active tab to capture fetch/XHR calls and detect API endpoints on the page.

storage: Used to save captured endpoints locally in your browser so they persist between popup sessions.

remote code use: This extension loads ExtensionPay's payment script (https://extensionpay.com/extended.js) at runtime to process one-time purchases and verify license status. This is the only remotely-hosted code; all other functionality is contained in the extension package.

single purpose: FastAPI Doc Gen captures API endpoints from web pages and generates OpenAPI/Swagger specification files for developers.

data usage: This extension does not collect or transmit any personal or sensitive user data. All processing happens locally in the browser. Payment is handled by ExtensionPay under its own policy.
```
