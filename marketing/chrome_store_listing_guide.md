# Chrome Web Store Listing — Step-by-Step Guide

## Your Publisher ID
`ac9f65ad-6ee5-47e6-9551-4861c9fe8092`

## Step 1: Go to the Developer Dashboard
URL: https://chrome.google.com/webstore/devconsole

## Step 2: Add New Item
1. Click "Add new item"
2. Click "Package" (upload ZIP)
3. Select `fastapi-doc-gen.zip` from `~/Projects/fastapi-doc-gen/`
4. Click "Open"

## Step 3: Fill in Listing Details

### Basic Info
- **Title:** FastAPI Doc Gen — OpenAPI Generator
- **Short description:** Capture API endpoints from any web app and generate OpenAPI/Swagger specs. One-time purchase, no subscription.
- **Full description:** (see `marketing/listing_copy.md`)
- **Category:** Developer tools
- **Language:** English

### Screenshots (upload these)
Take screenshots of:
1. Main popup with "Scan Page for APIs" button
2. Captured endpoints list
3. Generated OpenAPI spec output
4. Copy/download buttons

### Icons
- The extension already has icons (16/32/48/128px) — they'll be auto-detected from the ZIP

### Privacy Policy
- URL: https://github.com/ptrken01/fastapi-doc-gen#privacy
- Or create a simple privacy policy: "FastAPI Doc Gen processes all data locally in your browser. No data is sent to any server. No data is collected, stored, or transmitted."

### Support URL
- https://github.com/ptrken01/fastapi-doc-gen/issues

### Promotional Image (optional)
- 440x280px image showing the extension in action

## Step 4: Set Visibility
- **Visibility:** Public
- **Publish:** Immediately (or schedule for a specific time)

## Step 5: Click "Publish"
- Review all details
- Click "Publish"
- The extension will be reviewed (usually within 1-24 hours)

## Step 6: After Publishing
1. Copy the Chrome Web Store URL
2. Update README.md with the link
3. Post on Product Hunt with the Chrome Web Store URL
4. Announce on GitHub, Hacker News, and dev communities

## What Happens Next
- Users can find and install the extension from the Chrome Web Store
- ExtensionPay handles the $29 one-time purchase
- You earn ~$26 per sale (after 10% fees)
- Updates are automatic (upload new ZIP, click "Publish update")

## Troubleshooting
- If the upload fails, check that the ZIP contains all required files
- If the review takes > 24 hours, check the developer dashboard for issues
- If users report installation issues, check the Chrome Web Store listing for errors

## Quick Reference
```
Dashboard: https://chrome.google.com/webstore/devconsole
ZIP: ~/Projects/fastapi-doc-gen/fastapi-doc-gen.zip
Listing copy: ~/Projects/fastapi-doc-gen/marketing/listing_copy.md
Upload script: ~/Projects/fastapi-doc-gen/upload_to_chrome_store.py
```
