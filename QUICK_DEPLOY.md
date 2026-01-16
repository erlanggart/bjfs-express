# Quick Reference - Hostinger Deployment

## 🗄️ Database Setup (5 menit)

### Di hPanel:
1. **Databases** → **MySQL Databases**
2. **Create Database** → catat nama lengkap (dengan prefix)
3. **Create User** → buat username & password kuat
4. **Add User to Database** → All Privileges
5. **Catat semua credentials!**

### Format Credentials Hostinger:
```
DB_HOST=mysql.hostinger.com
DB_NAME=u702886622_bogorjuniorfs
DB_USER=u702886622_erlangga
DB_PASSWORD=password_kuat_kamu
DB_PORT=3306
```

> **Note:** Database sudah ada! Username: `u702886622_erlangga`, DB: `u702886622_bogorjuniorfs`

---

## 🔐 Generate JWT Secret

### Run script:
```bash
cd bogorjunior-backend
./scripts/generate-jwt-secret.sh
```

### Copy output, simpan untuk environment variables!

---

## 📤 Import Database

### Export dari local:
```bash
mysqldump -u root -p bogorjuniorfs > bogorjuniorfs.sql
```

### Import ke Hostinger:
1. hPanel → **phpMyAdmin**
2. Pilih database production
3. Tab **Import** → pilih file SQL
4. Klik **Go**

---

## ⚙️ Environment Variables di Hostinger

### Di hPanel → Node.js App → Edit → Environment Variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database - GUNAKAN CREDENTIALS INI:
DB_HOST=mysql.hostinger.com
DB_USER=u702886622_erlangga
DB_PASSWORD=password_database_kamu
DB_NAME=u702886622_bogorjuniorfs
DB_PORT=3306

# JWT (GANTI dengan hasil generate!)
JWT_SECRET=hasil_dari_script_generate_jwt
JWT_EXPIRES_IN=24h

# CORS (SESUAIKAN!)
CORS_ORIGIN=https://bogorjuniorfs.com

# Uploads (SESUAIKAN path!)
MAX_FILE_SIZE=5242880
UPLOAD_PATH=/home/u702886622/domains/api.bogorjuniorfs.com/public_html/uploads
```

---

## 📁 Setup Folders Upload

### Via SSH atau File Manager:
```bash
cd /home/u702886622/domains/api.bogorjuniorfs.com/public_html
mkdir -p uploads/articles uploads/avatars uploads/content uploads/documents
mkdir -p uploads/hero uploads/matches uploads/proofs uploads/signatures
chmod -R 755 uploads
```

---

## 🚀 Deploy

### Via Git (Recommended):
1. Push ke GitHub:
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. Di hPanel → Node.js App:
   - **Git Deployment** → Connect repository
   - Pilih branch `main`
   - Klik **Deploy**

3. Wait 1-2 minutes

4. **Restart** aplikasi

---

## ✅ Testing

### 1. Health Check:
```bash
curl https://api.bogorjuniorfs.com/health
```
**Expected:** `{"status":"OK","timestamp":"..."}`

### 2. Cek Logs:
hPanel → Node.js App → **Logs** tab
**Look for:** `✅ Database connected successfully`

### 3. Test Login:
```bash
curl -X POST https://api.bogorjuniorfs.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nomor_id":"admin","password":"password123"}'
```
**Expected:** JWT token

---

## 🐛 Troubleshooting Cepat

### Database Connection Failed?
- ✅ Cek DB_HOST harus `mysql.hostinger.com` (bukan localhost!)
- ✅ Cek username/database ada prefix `u123456_`
- ✅ Test login via phpMyAdmin dengan credentials yang sama

### CORS Error?
- ✅ Update `CORS_ORIGIN` di environment variables
- ✅ Restart aplikasi setelah update

### Upload File Error?
- ✅ Cek folder uploads sudah dibuat
- ✅ Cek permissions: `chmod -R 755 uploads`
- ✅ Cek `UPLOAD_PATH` di environment variables

### Port Error?
- ✅ Jangan hardcode port di kode
- ✅ Gunakan `process.env.PORT`
- ✅ Hostinger assign port otomatis

---

## 📱 Update Frontend

### .env.production:
```bash
VITE_API_URL=https://api.bogorjuniorfs.com
VITE_APP_NAME=Bogor Junior FS
```

### Build & Deploy:
```bash
cd bogorjunior-frontend
npm run build
# Upload folder dist/ ke public_html bogorjuniorfs.com
```

---

## 📊 Monitoring

### Cek setiap hari (minggu pertama):
- [ ] **Logs** - cek error messages
- [ ] **CPU/Memory** - monitor usage
- [ ] **Disk Space** - pastikan tidak penuh
- [ ] **User Reports** - collect feedback

---

## 🔄 Update/Redeploy

### Deploy update baru:
```bash
git add .
git commit -m "Update feature"
git push origin main
# Auto-deploy if Git deployment enabled
# Or manually click Deploy di hPanel
```

---

## 📞 Need Help?

- **Live Chat**: 24/7 di hPanel (kanan bawah)
- **Email**: support@hostinger.com
- **Docs**: https://support.hostinger.com

---

**💡 Tips:**
- Simpan semua credentials di password manager
- Backup database sebelum update besar
- Test di staging/local dulu sebelum deploy
- Monitor logs 24 jam pertama setelah deploy
