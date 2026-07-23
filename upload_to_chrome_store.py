#!/usr/bin/env python3
"""
Chrome Web Store upload helper for FastAPI Doc Gen.

This script automates the upload of the extension ZIP to the Chrome Web Store
once you provide an OAuth 2.0 access token with the chromewebstore scope.

Usage:
  1. Get an OAuth token from:
     https://accounts.google.com/o/oauth2/auth?
       client_id=YOUR_CLIENT_ID&
       redirect_uri=urn:ietf:wg:oauth:2.0:oob&
       scope=https://www.googleapis.com/auth/chromewebstore&
       response_type=code&
       access_type=offline

  2. Exchange the code for a token at:
     https://oauth2.googleapis.com/token

  3. Run this script with the token:
     python3 upload_to_chrome_store.py --token YOUR_ACCESS_TOKEN

  Or use the Chrome Web Store developer dashboard directly:
     https://chrome.google.com/webstore/devconsole
"""
import json, os, sys, argparse, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(HERE, "fastapi-doc-gen.zip")
UPLOAD_URL = "https://www.googleapis.com/upload/chromewebstore/v1.1/items"
PUBLISH_URL = "https://www.googleapis.com/chromewebstore/v1.1/items/{item_id}/publish"

def upload_extension(access_token):
    """Upload the extension ZIP to the Chrome Web Store."""
    if not os.path.exists(ZIP_PATH):
        print(f"ERROR: ZIP file not found at {ZIP_PATH}")
        print("Run: cd ~/Projects/fastapi-doc-gen && zip -r fastapi-doc-gen.zip manifest.json popup/ content/ background/ options/ icons/")
        return False
    
    print(f"Uploading {ZIP_PATH} ({os.path.getsize(ZIP_PATH)} bytes)...")
    
    cmd = [
        "curl", "-s", "-X", "POST",
        UPLOAD_URL,
        "-H", f"Authorization: Bearer {access_token}",
        "-H", "x-goog-api-version: 2",
        "-H", "Content-Type: application/octet-stream",
        "-H", "x-goog-channel-token: fastapi-doc-gen",
        "--data-binary", f"@{ZIP_PATH}",
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Upload failed: {result.stderr}")
        return False
    
    try:
        response = json.loads(result.stdout)
        if response.get("ok"):
            item_id = response.get("id") or response.get("itemId")
            print(f"✓ Upload successful! Item ID: {item_id}")
            print(f"  Response: {json.dumps(response, indent=2)}")
            return True
        else:
            print(f"Upload response: {json.dumps(response, indent=2)}")
            return False
    except json.JSONDecodeError:
        print(f"Unexpected response: {result.stdout}")
        return False

def publish_extension(access_token, item_id):
    """Publish the uploaded extension to the Chrome Web Store."""
    print(f"\nPublishing item {item_id}...")
    
    cmd = [
        "curl", "-s", "-X", "POST",
        PUBLISH_URL.format(item_id=item_id),
        "-H", f"Authorization: Bearer {access_token}",
        "-H", "x-goog-api-version: 2",
        "-H", "Content-Length: 0",
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Publish failed: {result.stderr}")
        return False
    
    try:
        response = json.loads(result.stdout)
        print(f"✓ Publish response: {json.dumps(response, indent=2)}")
        return True
    except json.JSONDecodeError:
        print(f"Unexpected response: {result.stdout}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Upload FastAPI Doc Gen to Chrome Web Store")
    parser.add_argument("--token", required=True, help="OAuth 2.0 access token with chromewebstore scope")
    parser.add_argument("--publish", action="store_true", help="Also publish after upload")
    args = parser.parse_args()
    
    print("=" * 60)
    print("FastAPI Doc Gen — Chrome Web Store Upload")
    print("=" * 60)
    
    # Upload
    success = upload_extension(args.token)
    if not success:
        print("\n❌ Upload failed. Check the error above.")
        print("\nTo get an OAuth token:")
        print("1. Go to: https://chrome.google.com/webstore/devconsole")
        print("2. Click 'Add new item' → 'Package'")
        print("3. Upload fastapi-doc-gen.zip manually")
        print("4. Or get an OAuth token from the Chrome Web Store API docs")
        return 1
    
    print("\n✅ Extension uploaded successfully!")
    print("\nNext steps:")
    print("1. Go to https://chrome.google.com/webstore/devconsole")
    print("2. Fill in the listing details (title, description, screenshots)")
    print("3. Set visibility to 'Public'")
    print("4. Click 'Publish'")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
