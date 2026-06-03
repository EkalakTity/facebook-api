# Facebook Personal Agent - Setup Guide

## Quick Start

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Windows (Command Prompt)
```cmd
setup.bat
```

### Linux/Mac (Bash)
```bash
chmod +x setup.sh
./setup.sh
```

---

## Manual Setup (If Scripts Don't Work)

### Prerequisites
- Node.js v18+ ([Download](https://nodejs.org/))
- npm v9+ (comes with Node.js)
- Chrome or Firefox browser
- 2GB free disk space (for Playwright browsers)

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- TypeScript and ts-node
- Playwright for browser automation
- better-sqlite3 for database
- chalk for colored output
- inquirer for interactive CLI
- dotenv for environment variables

### Step 2: Install Playwright Browsers

```bash
npx playwright install chromium
```

Or with system dependencies:
```bash
npx playwright install chromium --with-deps
```

**Note:** This downloads ~500MB of browser binaries. It may take 2-5 minutes.

### Step 3: Create .env Configuration

Copy the template:
```bash
cp .env.example .env
```

Or manually create `.env`:
```env
# Browser Profile Path (UPDATE THIS)
BROWSER_PROFILE_PATH=/path/to/your/browser/profile

# Database
DB_PATH=./data/agent.db

# Configuration
NODE_ENV=development
LOG_LEVEL=info
HEADLESS=false
SLOW_MO=50
```

### Step 4: Initialize Database

```bash
npm run migrate
```

This creates 7 tables in `data/agent.db`:
- accounts
- targets
- message_templates
- scanned_posts
- review_queue
- processed_posts
- logs

### Step 5: Set Up Browser Profile with Facebook Login

#### For Chrome

**Windows:**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --user-data-dir="$env:USERPROFILE\Facebook_Profile"
```

**Mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$HOME/Facebook_Profile"
```

**Linux:**
```bash
google-chrome \
  --user-data-dir="$HOME/Facebook_Profile"
```

#### For Firefox

**Windows:**
```powershell
& "C:\Program Files\Mozilla Firefox\firefox.exe" `
  -profile "$env:USERPROFILE\AppData\Roaming\Mozilla\Firefox\Profiles\facebook_profile"
```

**Mac:**
```bash
/Applications/Firefox.app/Contents/MacOS/firefox \
  -profile "$HOME/Library/Application Support/Firefox/facebook_profile"
```

**Linux:**
```bash
firefox \
  -profile "$HOME/.mozilla/firefox/facebook_profile"
```

### Step 6: Login to Facebook

1. In the opened browser, navigate to `https://facebook.com`
2. Login with your Facebook account
3. **Important:** Stay logged in
4. Close the browser (don't logout)

### Step 7: Update .env with Profile Path

Edit `.env` and set the correct path:

**Windows:**
```env
BROWSER_PROFILE_PATH=C:\Users\YOUR_USERNAME\Facebook_Profile
```

**Mac:**
```env
BROWSER_PROFILE_PATH=/Users/YOUR_USERNAME/Facebook_Profile
```

**Linux:**
```env
BROWSER_PROFILE_PATH=/home/YOUR_USERNAME/Facebook_Profile
```

**⚠️ Important:** Use the exact path where you created the profile. It should be an absolute path, not relative.

---

## Running the Agent

### Start the Agent
```bash
npm run agent
```

You should see:
```
╔══════════════════════════════════════╗
║  Facebook Personal Agent  v1.0.0     ║
╚══════════════════════════════════════╝

? เลือกการทำงาน:
> เริ่มงานใหม่ 
  ดู Review Queue 
  ดู Log ล่าสุด 
  ออกจากโปรแกรม
```

### Select New Job
1. Choose **เริ่มงานใหม่** (New Job)
2. Select or create message template
3. Set scan parameters
4. Watch the agent scan your Facebook feed

---

## Troubleshooting

### "Browser profile not found"
**Error:** `BROWSER_PROFILE_PATH doesn't exist`

**Solution:**
1. Verify the path in `.env` is correct
2. Use an absolute path (not relative)
3. Make sure the profile was created with the exact command above
4. For Windows, use backslashes or escape them: `C:\\Users\\...` or `C:/Users/...`

### "Failed to create a ProcessSingleton"
**Error:** Profile is already in use by another instance

**Solution:**
1. Close all Chrome/Firefox windows
2. Delete the lock file in the profile directory
3. Try again

**For Chrome:**
- Windows: Delete `C:\Users\YOUR_USERNAME\Facebook_Profile\Singleton*`
- Mac: Delete `~/Facebook_Profile/Singleton*`
- Linux: Delete `~/.Facebook_Profile/Singleton*`

### "Session not logged in"
**Error:** System detects no Facebook session

**Solution:**
1. Login to Facebook again in the browser profile
2. Ensure cookies are enabled
3. Don't logout (stay logged in)
4. Close the browser normally (don't force-close)

### "Post scanning not working"
**Possible causes:**
- Facebook changed HTML structure
- Browser not scrolling to load posts
- Network issues

**Solutions:**
1. Check browser console for errors
2. Verify you're on the main feed (not a specific page)
3. Ensure the profile is properly logged in
4. Try a different browser (Chrome or Firefox)

### "Database error"
**Error:** Various SQLite errors

**Solution:**
```bash
# Reset database
npm run migrate
```

---

## Verification

### Test Installation
```bash
npm run agent
```

Then:
1. Try navigating the menu
2. Select "ดู Review Queue" - should show empty queue
3. Select "ดู Log ล่าสุด" - should show system logs
4. Select "ออกจากโปรแกรม" - should exit cleanly

### Test Database
```bash
npm run migrate
```

You should see:
```
✓ Created 7 tables successfully
✓ Seeded 3 message templates
✓ All indexes created
```

---

## Advanced Configuration

### Log Level
In `.env`, set log detail:
```env
LOG_LEVEL=debug  # verbose
LOG_LEVEL=info   # normal (default)
LOG_LEVEL=warn   # warnings only
LOG_LEVEL=error  # errors only
```

### Headless Mode
Run browser in background (no window):
```env
HEADLESS=true
```

### Slow Motion
Add delay between actions (ms):
```env
SLOW_MO=100  # 100ms delay per action
```

### Custom Database Path
```env
DB_PATH=/path/to/database.db
```

---

## Project Structure

```
facebook-api/
├── src/                    # TypeScript source code
│   ├── agents/            # Business logic
│   ├── cli/               # User interface
│   ├── db/                # Database layer
│   ├── config/            # Configuration
│   ├── types/             # Type definitions
│   └── utils/             # Utilities
├── dist/                  # Compiled JavaScript
├── data/                  # Database and cache
│   └── agent.db          # SQLite database
├── logs/                  # Activity logs
├── .env                   # Environment (create from .env.example)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── setup.ps1/bat/sh      # Setup scripts
```

---

## Next Steps

1. ✅ Run setup script or follow manual steps
2. ✅ Verify `.env` has correct `BROWSER_PROFILE_PATH`
3. ✅ Test with `npm run agent`
4. ✅ Create first job to scan Facebook feed
5. ✅ Review posts in queue
6. ✅ Mark as done or reject posts
7. ✅ Check logs for activity history

---

## Getting Help

### Documentation Files
- `PROJECT_MEMORY.md` - System architecture and design
- `TASKS.md` - Implementation details (Thai)
- `VERIFICATION_REPORT.md` - Full feature list
- `VERIFICATION_RESULTS.md` - Test results

### Common Commands
```bash
npm run agent        # Start the agent
npm run migrate      # Reset/initialize database
npm run agent:build  # Compile TypeScript to JavaScript
npm run test:browser # Test browser connection
```

### Support
- Check browser console for JavaScript errors
- Review logs in `logs/` directory
- Check database in `data/agent.db`
- Refer to error messages - they include helpful hints

---

## License & Attribution

Facebook Personal Agent v1.0.0
- Implemented with TypeScript, Playwright, and SQLite
- Built with Node.js ecosystem tools
- Human-in-the-loop design (no automated actions)
