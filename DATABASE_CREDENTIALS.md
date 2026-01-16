# Database Credentials - Hostinger Production

## ✅ Database Information

**Database Name:** `u702886622_bogorjuniorfs`  
**Username:** `u702886622_erlangga`  
**Password:** *(set saat membuat user atau reset via hPanel)*  
**Host:** `mysql.hostinger.com` *(atau cek di hPanel)*  
**Port:** `3306`  
**Created:** 2025-08-02

---

## 📋 Environment Variables untuk Production

Copy konfigurasi ini ke **Node.js App Environment Variables** di hPanel:

```bash
# Database Configuration
DB_HOST=mysql.hostinger.com
DB_USER=u702886622_erlangga
DB_PASSWORD=PASSWORD_KAMU_DISINI
DB_NAME=u702886622_bogorjuniorfs
DB_PORT=3306
```

---

## 🔍 Verifikasi Database Host

Database host bisa berbeda, cek di hPanel:

1. Login ke **hPanel**
2. **Databases** → **MySQL Databases**
3. Lihat bagian **Database Details** atau **Connection Details**
4. Copy **Hostname** atau **Server** yang tertera

Kemungkinan hostname:
- `mysql.hostinger.com` (paling umum)
- `localhost` (jika backend dan DB di server yang sama)
- IP address spesifik (contoh: `123.45.67.89`)
- Hostname custom (contoh: `mysql1.hostinger.com`)

---

## 🧪 Test Koneksi Database

### Via phpMyAdmin:
1. hPanel → **Databases** → **phpMyAdmin**
2. Login dengan:
   - Username: `u702886622_erlangga`
   - Password: (password database kamu)
3. Pilih database: `u702886622_bogorjuniorfs`
4. Jika berhasil login, credentials benar ✅

### Via MySQL Command Line (jika ada SSH):
```bash
mysql -h mysql.hostinger.com -u u702886622_erlangga -p u702886622_bogorjuniorfs
# Enter password when prompted
```

---

## 📊 Database Stats

- **Size:** 14 MB
- **Tables:** (akan terisi setelah import)
- **Users:** 
  - `u702886622_erlangga` (existing)
  - Bisa tambah user lain jika perlu untuk backup/monitoring

---

## 🔄 Import Database

### Export dari Local:
```bash
mysqldump -u root -p bogorjuniorfs > bogorjuniorfs_export.sql
```

### Import ke Hostinger:

**Option 1: Via phpMyAdmin**
1. hPanel → phpMyAdmin
2. Pilih database `u702886622_bogorjuniorfs`
3. Tab **Import**
4. Browse file `bogorjuniorfs_export.sql`
5. Klik **Go**
6. Wait until complete

**Option 2: Via SSH (jika tersedia)**
```bash
mysql -h mysql.hostinger.com -u u702886622_erlangga -p u702886622_bogorjuniorfs < bogorjuniorfs_export.sql
```

---

## ⚠️ Important Notes

### 1. Password Security
- Jangan commit password ke Git
- Gunakan password yang kuat (min 16 karakter)
- Simpan di password manager (LastPass, 1Password, dll)

### 2. Database Backup
Sebelum import/update, selalu backup dulu:
1. hPanel → phpMyAdmin
2. Pilih database
3. Tab **Export**
4. Format: SQL
5. Klik **Go**
6. Simpan file `.sql`

### 3. User Permissions
Cek user `u702886622_erlangga` sudah punya **All Privileges**:
1. hPanel → **MySQL Databases**
2. Scroll ke **Current Databases**
3. Lihat **Privileged Users**
4. Pastikan `u702886622_erlangga` ada dengan status **All Privileges**

---

## 🚀 Next Steps

1. ✅ Verify database host via hPanel
2. ✅ Test login via phpMyAdmin
3. ✅ Import database dari local
4. ✅ Set environment variables di Node.js App
5. ✅ Deploy & test backend connection

---

**Need Help?**
- Check hostname: hPanel → Databases → MySQL Databases → Connection Details
- Reset password: hPanel → Databases → MySQL Databases → Users → Change Password
- Support: Hostinger Live Chat 24/7
