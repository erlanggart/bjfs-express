# Setup Environment Variables untuk Production

## 🎯 Quick Setup

### 1. Generate JWT Secret
```bash
cd bogorjunior-backend
./scripts/generate-jwt-secret.sh
```
**Copy output JWT Secret** yang dihasilkan!

### 2. Edit .env.production
Buka file [.env.production](cci:1://file:///home/erlangga/Projects/bjfs/bogorjunior-backend/.env.production:0:0-0:0) dan isi:

```bash
# Line 18 - Password Database
DB_PASSWORD=password_kamu_dari_hpanel

# Line 26 - JWT Secret dari generate
JWT_SECRET=hasil_generate_dari_script_tadi
```

### 3. Copy ke hPanel

**Option A: Copy Manual (Recommended)**
1. Login ke hPanel Hostinger
2. **Advanced** → **Node.js** → Pilih aplikasi backend
3. Klik **Edit** atau **Settings**
4. Scroll ke **Environment Variables**
5. Buka [.env.production](cci:1://file:///home/erlangga/Projects/bjfs/bogorjunior-backend/.env.production:0:0-0:0) di editor
6. Copy **setiap baris** (kecuali comment) ke hPanel:
   - **Name**: `PORT` → **Value**: `3000`
   - **Name**: `NODE_ENV` → **Value**: `production`
   - **Name**: `DB_HOST` → **Value**: `mysql.hostinger.com`
   - dst...
7. Klik **Save**

**Option B: Bulk Input (jika tersedia)**
Beberapa hosting panel support bulk input, paste seluruh isi file tanpa comment.

---

## 📋 Environment Variables Detail

### Required (WAJIB ISI):
```bash
PORT=3000
NODE_ENV=production
DB_HOST=mysql.hostinger.com
DB_USER=u702886622_erlangga
DB_PASSWORD=your_password_here          # ← ISI INI!
DB_NAME=u702886622_bogorjuniorfs
DB_PORT=3306
JWT_SECRET=generate_64_char_random      # ← ISI INI!
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://bogorjuniorfs.com
MAX_FILE_SIZE=5242880
UPLOAD_PATH=/home/u702886622/domains/api.bogorjuniorfs.com/public_html/uploads
```

### Optional (bisa diisi nanti):
```bash
GA4_PROPERTY_ID=your-property-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## ✅ Verification Checklist

Sebelum klik **Save & Restart**:

- [ ] `DB_PASSWORD` sudah diisi dengan password yang benar
  - Test login via phpMyAdmin dulu untuk memastikan
- [ ] `JWT_SECRET` sudah diisi hasil generate (min 64 karakter)
  - Jangan gunakan default dari .env.example!
- [ ] `CORS_ORIGIN` sesuai dengan domain frontend
  - Jika frontend di `bogorjuniorfs.com`, isi `https://bogorjuniorfs.com`
  - Jika subdomain, misal `www.bogorjuniorfs.com`, sesuaikan
- [ ] `UPLOAD_PATH` menggunakan absolute path
  - Format: `/home/u702886622/domains/[subdomain]/public_html/uploads`
- [ ] Tidak ada typo di nama environment variable
- [ ] Tidak ada spasi sebelum/sesudah nilai

---

## 🔄 Update Environment Variables

Jika perlu update setelah deployment:

1. hPanel → Node.js → Edit aplikasi
2. Environment Variables → Edit value yang perlu diubah
3. **Save**
4. **Restart** aplikasi (penting!)
5. Tunggu 30-60 detik
6. Test endpoint untuk verifikasi

---

## 🐛 Troubleshooting

### Database Connection Error
```
❌ Database connection failed: Access denied
```
**Fix:**
- Cek `DB_PASSWORD` benar
- Cek `DB_USER` dan `DB_NAME` ada prefix `u702886622_`
- Test login via phpMyAdmin dengan credentials yang sama

### JWT Error
```
❌ jwt must be provided / jwt malformed
```
**Fix:**
- Pastikan `JWT_SECRET` sudah di-generate, minimal 64 karakter
- Jangan gunakan default value dari .env.example
- Restart aplikasi setelah update JWT_SECRET

### CORS Error
```
❌ CORS policy: No 'Access-Control-Allow-Origin' header
```
**Fix:**
- Update `CORS_ORIGIN` dengan domain frontend yang benar
- Gunakan `https://` untuk production (bukan `http://`)
- Restart aplikasi setelah update

### Upload Error
```
❌ ENOENT: no such file or directory, open '/uploads/...'
```
**Fix:**
- Cek `UPLOAD_PATH` menggunakan absolute path (bukan relative)
- Pastikan folder uploads sudah dibuat di server
- Cek permissions: `chmod -R 755 uploads`

---

## 📞 Need Help?

- **Get DB Password**: hPanel → MySQL Databases → Users → Change Password
- **Generate JWT**: Run `./scripts/generate-jwt-secret.sh` 
- **Test DB**: phpMyAdmin di hPanel
- **Support**: Hostinger Live Chat 24/7

---

## 🔒 Security Notes

⚠️ **JANGAN:**
- Commit .env.production yang sudah diisi password/secret ke Git
- Share JWT_SECRET di chat/email
- Gunakan password database yang lemah

✅ **LAKUKAN:**
- Simpan credentials di password manager
- Backup .env.production di tempat aman (encrypted)
- Generate JWT_SECRET baru untuk setiap environment
- Gunakan strong password (min 16 karakter, campuran huruf/angka/simbol)
