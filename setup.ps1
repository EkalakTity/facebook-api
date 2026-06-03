# Facebook Personal Agent - Setup Script
# This script automates the initial setup process

$ErrorActionPreference = "Continue"

function Write-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Facebook Personal Agent - Setup                          ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$step, [string]$message)
    Write-Host "[$step] $message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$message)
    Write-Host "✗ ERROR: $message" -ForegroundColor Red
}

function Write-Success {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$message)
    Write-Host "⚠ WARNING: $message" -ForegroundColor Yellow
}

# Start setup
Write-Header

Write-Host "This script will:" -ForegroundColor Cyan
Write-Host "  1. Check Node.js and npm installation"
Write-Host "  2. Install dependencies"
Write-Host "  3. Install Playwright browsers"
Write-Host "  4. Create/update .env configuration"
Write-Host "  5. Initialize database"
Write-Host "  6. Set up browser profile for Facebook"
Write-Host ""

# Check Node.js
Write-Step "1/6" "Checking Node.js installation..."
$node = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Node.js installed: $node"
} else {
    Write-Error-Custom "Node.js not found. Please install from https://nodejs.org/"
    exit 1
}

# Check npm
Write-Step "2/6" "Checking npm installation..."
$npm = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "npm installed: v$npm"
} else {
    Write-Error-Custom "npm not found"
    exit 1
}

# Install dependencies
Write-Step "3/6" "Installing dependencies..."
Write-Host "  (This may take a minute...)" -ForegroundColor Gray
npm install --silent 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencies installed"
} else {
    Write-Error-Custom "Failed to install dependencies"
    exit 1
}

# Install Playwright browsers
Write-Step "4/6" "Installing Playwright browsers..."
Write-Host "  (This may take 2-5 minutes, downloading ~1GB...)" -ForegroundColor Gray
npx playwright install chromium --with-deps 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Playwright browsers installed"
} else {
    Write-Error-Custom "Failed to install Playwright browsers"
    exit 1
}

# Check/create .env
Write-Step "5/6" "Configuring environment..."
if (Test-Path ".env") {
    Write-Success ".env file already exists"
    $overwrite = Read-Host "Overwrite with default settings? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "  Skipping .env update" -ForegroundColor Gray
    } else {
        Copy-Item ".env.example" ".env" -Force
        Write-Success ".env updated from template"
    }
} else {
    Copy-Item ".env.example" ".env"
    Write-Success ".env created from template"
}

# Initialize database
Write-Step "6/6" "Setting up database..."
npm run migrate 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Database initialized with 7 tables"
} else {
    Write-Error-Custom "Failed to initialize database"
    exit 1
}

# Browser profile setup
Write-Header
Write-Host "Browser Profile Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now you need to set up a browser profile with Facebook login." -ForegroundColor White
Write-Host ""
Write-Host "Follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Open Chrome or Firefox with a new profile:" -ForegroundColor White
Write-Host "     For Chrome:" -ForegroundColor Gray
Write-Host '       "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="$env:USERPROFILE\Facebook_Profile"' -ForegroundColor DarkGray
Write-Host ""
Write-Host "     For Firefox:" -ForegroundColor Gray
Write-Host '       "C:\Program Files\Mozilla Firefox\firefox.exe" -profile "$env:USERPROFILE\AppData\Roaming\Mozilla\Firefox\Profiles\facebook_profile"' -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. Log into Facebook with your account" -ForegroundColor White
Write-Host ""
Write-Host "  3. Close the browser (keep it logged in)" -ForegroundColor White
Write-Host ""
Write-Host "  4. Update .env with the profile path:" -ForegroundColor White
Write-Host '     BROWSER_PROFILE_PATH=C:\Users\YOUR_USERNAME\Facebook_Profile' -ForegroundColor DarkGray
Write-Host ""

$ready = Read-Host "Have you completed the browser profile setup? (y/n)"
if ($ready -eq "y") {
    $profilePath = Read-Host "Enter your browser profile path (or press Enter to skip for now)"
    if ($profilePath) {
        $envContent = Get-Content ".env" -Raw
        $envContent = $envContent -replace 'BROWSER_PROFILE_PATH=.*', "BROWSER_PROFILE_PATH=$profilePath"
        Set-Content ".env" $envContent
        Write-Success "Profile path updated in .env"
    }
}

# Summary
Write-Header
Write-Host "Setup Complete! ✓" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review .env file and ensure BROWSER_PROFILE_PATH is correct"
Write-Host "  2. Run the agent:"
Write-Host ""
Write-Host "     npm run agent" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Select 'เริ่มงานใหม่' (New Job) to start scanning"
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Cyan
Write-Host "  - Browser won't start? Ensure profile path is absolute and correct"
Write-Host "  - Not logged in? Login to Facebook in the profile before running agent"
Write-Host "  - Database error? Run: npm run migrate"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - VERIFICATION_REPORT.md - Full implementation details"
Write-Host "  - PROJECT_MEMORY.md - System architecture and flow"
Write-Host "  - TASKS.md - Implementation checklist"
Write-Host ""
