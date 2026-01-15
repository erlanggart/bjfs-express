#!/bin/bash

# Setup script for Bogor Junior Backend
# This script helps initialize the backend project

set -e

echo "🚀 Bogor Junior Backend Setup"
echo "=============================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18 or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your configuration"
else
    echo "ℹ️  .env file already exists"
fi
echo ""

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads/avatars
mkdir -p uploads/documents
mkdir -p uploads/hero
mkdir -p uploads/content
mkdir -p uploads/articles
mkdir -p uploads/matches
mkdir -p uploads/proofs
mkdir -p uploads/signatures
echo "✅ Upload directories created"
echo ""

# Create Google config directory
echo "📁 Creating Google config directory..."
mkdir -p config/google
touch config/google/.gitkeep
echo "✅ Google config directory created"
echo "⚠️  Place your service-account.json in config/google/"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
if command -v mysql &> /dev/null; then
    read -p "Do you want to test MySQL connection? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "MySQL username: " DB_USER
        read -sp "MySQL password: " DB_PASS
        echo
        if mysql -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" &> /dev/null; then
            echo "✅ MySQL connection successful"
        else
            echo "❌ MySQL connection failed"
        fi
    fi
else
    echo "⚠️  MySQL client not found, skipping connection test"
fi
echo ""

# Final instructions
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Place Google service account JSON in config/google/"
echo "3. Import database: mysql -u user -p database < your_database.sql"
echo "4. Start development server: npm run dev"
echo "5. Or start with PM2: pm2 start src/server.js --name bogorjunior-backend"
echo ""
echo "Documentation:"
echo "- README.md - Project overview"
echo "- DEPLOYMENT.md - Deployment guide"
echo ""
