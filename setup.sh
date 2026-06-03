#!/bin/bash

# Facebook Personal Agent - Setup Script
# This script automates the initial setup process for Linux/Mac

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Facebook Personal Agent - Setup                          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[${1}]${NC} ${2}"
}

print_error() {
    echo -e "${RED}✗ ERROR: ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: ${1}${NC}"
}

# Start setup
print_header

echo "This script will:"
echo "  1. Check Node.js and npm installation"
echo "  2. Install dependencies"
echo "  3. Install Playwright browsers"
echo "  4. Create/update .env configuration"
echo "  5. Initialize database"
echo "  6. Set up browser profile for Facebook"
echo ""

# Check Node.js
print_step "1/6" "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Check npm
print_step "2/6" "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm installed: v$NPM_VERSION"

# Install dependencies
echo ""
print_step "3/6" "Installing dependencies..."
echo "  (This may take a minute...)"
npm install --silent
print_success "Dependencies installed"

# Install Playwright browsers
echo ""
print_step "4/6" "Installing Playwright browsers..."
echo "  (This may take 2-5 minutes, downloading ~1GB...)"
npx playwright install chromium --with-deps
print_success "Playwright browsers installed"

# Check/create .env
echo ""
print_step "5/6" "Configuring environment..."
if [ -f ".env" ]; then
    print_success ".env file already exists"
    read -p "Overwrite with default settings? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env
        print_success ".env updated from template"
    else
        echo "  Skipping .env update"
    fi
else
    cp .env.example .env
    print_success ".env created from template"
fi

# Initialize database
echo ""
print_step "6/6" "Setting up database..."
npm run migrate > /dev/null 2>&1
print_success "Database initialized with 7 tables"

# Browser profile setup
clear
print_header

echo -e "${BLUE}Browser Profile Setup${NC}"
echo ""
echo "Now you need to set up a browser profile with Facebook login."
echo ""
echo "Follow these steps:"
echo ""
echo "  1. Open Chrome or Firefox with a new profile:"
echo ""
echo "     For Chrome:"
echo -e "     ${YELLOW}/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\\\"
echo "       --user-data-dir=\"\$HOME/Facebook_Profile\"${NC}"
echo ""
echo "     For Firefox (Mac):"
echo -e "     ${YELLOW}/Applications/Firefox.app/Contents/MacOS/firefox \\\\"
echo "       -profile \"\$HOME/Library/Application\\ Support/Firefox/facebook_profile\"${NC}"
echo ""
echo "     For Linux (Chrome):"
echo -e "     ${YELLOW}google-chrome \\\\"
echo "       --user-data-dir=\"\$HOME/Facebook_Profile\"${NC}"
echo ""
echo "  2. Log into Facebook with your account"
echo ""
echo "  3. Close the browser (keep it logged in)"
echo ""
echo "  4. Update .env with the profile path:"
echo -e "     ${YELLOW}BROWSER_PROFILE_PATH=\$HOME/Facebook_Profile${NC}"
echo ""

read -p "Have you completed the browser profile setup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your browser profile path (or press Enter to skip): " PROFILE_PATH
    if [ ! -z "$PROFILE_PATH" ]; then
        # Use sed to update .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|BROWSER_PROFILE_PATH=.*|BROWSER_PROFILE_PATH=$PROFILE_PATH|" .env
        else
            sed -i "s|BROWSER_PROFILE_PATH=.*|BROWSER_PROFILE_PATH=$PROFILE_PATH|" .env
        fi
        print_success "Profile path updated in .env"
    fi
fi

# Summary
clear
print_header

echo -e "${GREEN}Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review .env file and ensure BROWSER_PROFILE_PATH is correct"
echo "  2. Run the agent:"
echo ""
echo -e "     ${YELLOW}npm run agent${NC}"
echo ""
echo "  3. Select 'เริ่มงานใหม่' (New Job) to start scanning"
echo ""
echo -e "${BLUE}Troubleshooting:${NC}"
echo "  - Browser won't start? Ensure profile path is absolute and correct"
echo "  - Not logged in? Login to Facebook in the profile before running agent"
echo "  - Database error? Run: npm run migrate"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - VERIFICATION_REPORT.md - Full implementation details"
echo "  - PROJECT_MEMORY.md - System architecture and flow"
echo "  - TASKS.md - Implementation checklist"
echo ""
