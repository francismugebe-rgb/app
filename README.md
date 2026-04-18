# Web2App Enterprise Build System

This application is now configured with an **Enterprise-Grade Android Build Pipeline**. 

## How to finalize the "Private Hookup":

### 1. GitHub Configuration
1. Create a new private repository (this will hold your Android WebView template).
2. Copy the contents of your Android project into that repo.
3. In the repo settings, go to **Secrets and Variables > Actions** and add:
   - `STORE_PASSWORD`
   - `KEY_PASSWORD`
   - `KEY_ALIAS`
   - `KEYSTORE_FILE` (Base64 version of your `.jks` file)

### 2. Connect the Website
Update your `.env` file with your credentials:
```env
GITHUB_TOKEN=your_pat_token
GITHUB_OWNER=your_username
GITHUB_REPO=your_private_repo_name
```

### 3. Build Flow
The website now uses a **5-Stage Enterprise Wizard**:
1. **General Identity**: Website source and Application naming.
2. **Branding & Assets**: Custom icon uploading with adaptive mask generation.
3. **Appearance (Splash)**: Configure splash background colors and dynamic titles.
4. **Protocol (Pipeline)**: Package ID assignment and RSA-2048 signing protocol.
5. **Review & Deploy**: Final technical audit before build dispatch.

### 4. Adaptive Device Preview
The system features a 1:1 mobile emulator that stays active throughout the entire wizard, allowing you to toggle between "Splash" and "Result" views instantly.

## Deployment
Run `./deploy.sh` to apply the latest "Smoothened" UI and the GitHub integration.
