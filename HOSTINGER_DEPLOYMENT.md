# Panduan Deployment Backend ke Hostinger

## Prerequisites
- Hostinger Business Web Hosting
- Node.js Web App sudah dibuat (subdomain untuk API)
- Akses ke hPanel Hostinger

## Langkah 1: Setup Database MySQL di hPanel

### 1.1 Buat Database
1. Login ke **hPanel** → pilih hosting **bogorjuniorfs.com**
2. Buka menu **Databases** → **MySQL Databases**
3. Klik **Create New Database**
   - Database name: misalnya `u123456_bogorjuniorfs` (prefix otomatis dari Hostinger)
   - Klik **Create**

### 1.2 Buat User Database
1. Di halaman yang sama, scroll ke **MySQL Users**
2. Klik **Create New User**
   - Username: misalnya `u123456_bjfs_user`
   - Password: buat password yang kuat (simpan di tempat aman!)
   - Klik **Create**

### 1.3 Assign User ke Database
1. Scroll ke **Add User to Database**
2. Pilih user yang baru dibuat
3. Pilih database yang baru dibuat
4. Pilih **All Privileges**
5. Klik **Add**

### 1.4 Catat Detail Koneksi
Di halaman **MySQL Databases**, catat informasi ini:
```
DB_HOST: mysql.hostinger.com (atau host yang tertera)
DB_NAME: u123456_bogorjuniorfs (nama database lengkap dengan prefix)
DB_USER: u123456_bjfs_user (username lengkap dengan prefix)
DB_PASSWORD: password yang kamu buat tadi
DB_PORT: 3306 (default)
```

## Langkah 2: Import Database

### 2.1 Export Database Lokal
Dari terminal lokal:
```bash
# Export seluruh database
mysqldump -u root -p bogorjuniorfs > bogorjuniorfs_backup.sql
```

### 2.2 Import ke Hostinger
Ada 2 cara:

**Cara 1: Via phpMyAdmin di hPanel**
1. hPanel → **Databases** → **phpMyAdmin**
2. Pilih database yang baru dibuat
3. Tab **Import**
4. Pilih file `bogorjuniorfs_backup.sql`
5. Klik **Go**

**Cara 2: Via Terminal SSH (jika tersedia)**
```bash
mysql -h mysql.hostinger.com -u u123456_bjfs_user -p u123456_bogorjuniorfs < bogorjuniorfs_backup.sql
```

## Langkah 3: Setup Environment Variables di Node.js App

### 3.1 Akses Node.js App Settings
1. hPanel → **Advanced** → **Node.js**
2. Pilih aplikasi backend yang sudah dibuat
3. Klik **Edit** atau **Settings**

### 3.2 Tambahkan Environment Variables
Di bagian **Environment Variables**, tambahkan:

```
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=mysql.hostinger.com
DB_USER=u123456_bjfs_user
DB_PASSWORD=password_database_kamu
DB_NAME=u123456_bogorjuniorfs
DB_PORT=3306

# JWT Configuration
JWT_SECRET=generate-random-string-untuk-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://bogorjuniorfs.com

# Google Analytics Configuration (optional)
GA4_PROPERTY_ID=your-property-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=/home/u123456/domains/api.bogorjuniorfs.com/public_html/uploads
```

**PENTING untuk JWT_SECRET:**
Generate random string yang kuat:
```bash
# Cara 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Cara 2: OpenSSL
openssl rand -hex 64
```

### 3.3 Save dan Restart
1. Klik **Save** pada environment variables
2. Klik **Restart** aplikasi Node.js

## Langkah 4: Upload Kode Backend

### 4.1 Persiapan Kode
Pastikan file `.env` **TIDAK** di-commit ke Git:
```bash
# Cek .gitignore
cat .gitignore | grep .env
```

### 4.2 Upload via Git (Recommended)
1. Push ke GitHub/GitLab:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. Di hPanel → Node.js App → **Git Deployment**
   - Connect repository
   - Pilih branch `main`
   - Klik **Deploy**

### 4.3 Upload via FTP (Alternative)
1. hPanel → **Files** → **FTP Accounts**
2. Buat FTP account atau gunakan existing
3. Gunakan FileZilla atau FTP client lain
4. Upload semua file ke directory aplikasi Node.js

## Langkah 5: Install Dependencies

### 5.1 Via Node.js App Terminal (jika tersedia)
```bash
npm install --production
```

### 5.2 Via SSH
```bash
cd /home/u123456/domains/api.bogorjuniorfs.com/public_html
npm install --production
```

## Langkah 6: Setup Folder Uploads

### 6.1 Buat Struktur Folder
Via File Manager di hPanel atau SSH:
```bash
mkdir -p uploads/articles
mkdir -p uploads/avatars
mkdir -p uploads/content
mkdir -p uploads/documents
mkdir -p uploads/hero
mkdir -p uploads/matches
mkdir -p uploads/proofs
mkdir -p uploads/signatures
```

### 6.2 Set Permissions
```bash
chmod -R 755 uploads
```

## Langkah 7: Testing

### 7.1 Cek Health Endpoint
```bash
curl https://api.bogorjuniorfs.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-01-16T...",
  "uptime": 123.45
}
```

### 7.2 Cek Database Connection
Lihat logs aplikasi di hPanel Node.js App dashboard, pastikan ada:
```
✅ Database connected successfully
```

### 7.3 Test Login
```bash
curl -X POST https://api.bogorjuniorfs.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nomor_id":"test_user","password":"test_password"}'
```

## Langkah 8: Update Frontend URL

### 8.1 Production .env untuk Frontend
Buat file `.env.production` di frontend:
```
VITE_API_URL=https://api.bogorjuniorfs.com
VITE_APP_NAME=Bogor Junior FS
```

### 8.2 Build Frontend
```bash
cd bogorjunior-frontend
npm run build
```

### 8.3 Deploy Frontend
Upload folder `dist/` ke public_html hosting utama `bogorjuniorfs.com`

## Troubleshooting

### Database Connection Failed
- ✅ Cek DB_HOST: harus `mysql.hostinger.com` (bukan localhost)
- ✅ Cek prefix username dan database name
- ✅ Whitelist IP jika ada firewall restriction
- ✅ Test koneksi via phpMyAdmin dulu

### CORS Error
- ✅ Update `CORS_ORIGIN` di environment variables
- ✅ Pastikan domain frontend sudah benar
- ✅ Restart aplikasi setelah update

### Upload File Error
- ✅ Cek permissions folder uploads (755)
- ✅ Cek `UPLOAD_PATH` di environment variables
- ✅ Pastikan folder sudah dibuat semua

### JWT Token Invalid
- ✅ Pastikan `JWT_SECRET` sama dengan yang di-generate
- ✅ Jangan gunakan default secret dari .env.example
- ✅ Restart aplikasi setelah update JWT_SECRET

### Port Already in Use
- ✅ Hostinger biasanya assign port otomatis
- ✅ Gunakan `PORT` dari environment variables Hostinger
- ✅ Jangan hardcode port di kode

## Security Checklist

- [ ] JWT_SECRET diganti dengan random string yang kuat
- [ ] Database password kuat dan unik
- [ ] File .env tidak ter-commit ke Git
- [ ] CORS_ORIGIN diset ke domain production
- [ ] NODE_ENV=production
- [ ] Error messages tidak expose detail sistem
- [ ] Rate limiting aktif (jika ada)
- [ ] File uploads divalidasi type dan size
- [ ] SQL injection protected (gunakan prepared statements)

## Monitoring

### Check Logs
Di hPanel Node.js App dashboard:
- **Logs** tab untuk melihat console.log dan errors
- Monitor memory dan CPU usage
- Set up alerts jika perlu

### Database Backup
1. hPanel → **Databases** → **phpMyAdmin**
2. Export database secara regular
3. Simpan backup di tempat aman (Google Drive, dll)

## Update/Redeploy

### Via Git
```bash
# Local
git add .
git commit -m "Update feature"
git push origin main

# Hostinger akan auto-deploy jika Git deployment aktif
```

### Manual Update
1. Upload file yang berubah via FTP
2. SSH ke server
3. Restart Node.js app via hPanel

---

**Support:**
- Hostinger Live Chat: 24/7
- Knowledge Base: https://support.hostinger.com
- Email: support@hostinger.com
