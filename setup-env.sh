#!/bin/bash

# Script untuk copy file .env.server menjadi .env
# Gunakan ini di server hosting

echo "🔧 Setting up .env file for production..."

# Cek apakah .env.server ada
if [ ! -f ".env.server" ]; then
    echo "❌ Error: .env.server not found!"
    echo "Please make sure .env.server exists in the current directory."
    exit 1
fi

# Copy .env.server to .env
cp .env.server .env

echo "✅ .env file created successfully!"
echo ""
echo "📋 Current .env content:"
echo "─────────────────────────────────────────────────────────"
cat .env
echo "─────────────────────────────────────────────────────────"
echo ""
echo "💡 Next steps:"
echo "1. Verify the .env content above is correct"
echo "2. Run: npm install"
echo "3. Run: npx prisma generate"
echo "4. Run: npm start"
echo ""
echo "🔍 To test database connection:"
echo "   npm run test:db"
