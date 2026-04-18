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
The website now uses a **4-Stage Wizard**:
1. **General Identity**: Basic site URL and App Name.
2. **Visual Assets**: Review the auto-extracted logo.
3. **Build Pipeline**: Configure Package ID and Signing Scheme.
4. **Review & Deploy**: Trigger the secure GitHub Actions worker.

## Deployment
Run `./deploy.sh` to apply the latest "Smoothened" UI and the GitHub integration.
