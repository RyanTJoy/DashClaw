#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  DashClaw Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo ""
    echo "Install Node.js first:"
    echo "  Option 1: https://nodejs.org/"
    echo "  Option 2: brew install node"
    echo ""
    if command -v open &> /dev/null; then
        open "https://nodejs.org/"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://nodejs.org/"
    fi
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js found: $(node --version)"
echo ""

# Run the interactive setup script
node scripts/setup.mjs

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Setup failed. See errors above.${NC}"
    exit 1
fi

# Create start script
cat > start-dashboard.sh << 'EOF'
#!/bin/bash
echo "Starting DashClaw..."
echo "Opening http://localhost:3000 in your browser..."
(sleep 3 && (open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null)) &
npm run dev
EOF

chmod +x start-dashboard.sh
echo -e "${GREEN}[OK]${NC} Created start-dashboard.sh for easy launching"
echo ""
