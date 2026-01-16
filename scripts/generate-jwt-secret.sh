#!/bin/bash

# ===================================================
# Script untuk Generate JWT Secret yang Kuat
# ===================================================
# Gunakan script ini untuk generate JWT_SECRET production

echo "=================================================="
echo "  JWT Secret Generator untuk Production"
echo "=================================================="
echo ""
echo "Generating random JWT secret..."
echo ""

# Generate 64 byte random hex string
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo "✅ JWT Secret berhasil di-generate!"
echo ""
echo "Simpan JWT_SECRET berikut di environment variables production:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$JWT_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  PENTING:"
echo "   - Jangan commit JWT_SECRET ke Git"
echo "   - Simpan di tempat aman (password manager)"
echo "   - Gunakan JWT_SECRET yang berbeda untuk setiap environment"
echo ""
echo "📝 Cara penggunaan di Hostinger:"
echo "   1. Login ke hPanel"
echo "   2. Buka Node.js App → Edit → Environment Variables"
echo "   3. Tambah variabel: JWT_SECRET = [secret di atas]"
echo "   4. Save dan Restart aplikasi"
echo ""
echo "=================================================="
