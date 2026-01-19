# 🚀 Panduan Deploy ke Hostinger

## ⚠️ MASALAH UMUM & SOLUSI

### 1. Server Crash Loop / Restart Terus-menerus

**Penyebab:**

- File `.env` tidak ada atau tidak terbaca
- Koneksi database gagal
- Port sudah digunakan

**Solusi:**

```bash
# Cek apakah .env ada
ls -la /home/u702886622/domains/api.bogorjuniorfs.com/public_html/.env

# Pastikan format DATABASE_URL benar (untuk Prisma)
cat .env | grep DATABASE_URL
```

### 2. Environment Variables Tidak Terbaca

**Penyebab:**

- File `.env` tidak di root folder aplikasi
- Format `.env` salah (ada spasi, quotes tidak tepat)

**Solusi:**

1. File `.env` HARUS di folder yang sama dengan `package.json`
2. Tidak boleh ada spasi di sekitar `=`
3. Password dengan karakter special harus di-escape di DATABASE_URL

### 3. Koneksi Database Gagal

**Penyebab:**

- DATABASE_URL format salah
- Host database salah
- Password salah atau ada karakter special

**Solusi:**
Pastikan format DATABASE_URL benar:

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Jika password punya karakter special (?, |, @, dll), encode dengan URL encoding:

```
? = %3F
| = %7C
@ = %40
# = %23
```

Contoh:

```
Password asli: w?IxZK0a9E|2
Password encoded: w%3FIxZK0a9E%7C2
DATABASE_URL="mysql://u702886622_erlangga:w%3FIxZK0a9E%7C2@mysql.hostinger.com:3306/u702886622_bogorjuniorfs"
```

---

## 📝 LANGKAH DEPLOY

### Step 1: Persiapan File .env

1. Copy file `.env.server` menjadi `.env`
2. Edit sesuai kredensial hosting
3. **PENTING:** Encode password jika ada karakter special

### Step 2: Upload ke Hostinger

Upload file-file ini via File Manager atau FTP:

```
├── package.json
├── .env                    ← WAJIB!
├── src/
├── uploads/
├── prisma/
└── node_modules/ (akan di-install otomatis)
```

### Step 3: Set Environment Variables di Hostinger Panel

Buka Node.js App Manager → Environment Variables:

```
NODE_ENV=production
DATABASE_URL=mysql://u702886622_erlangga:w%3FIxZK0a9E%7C2@mysql.hostinger.com:3306/u702886622_bogorjuniorfs
PORT=3000
JWT_SECRET=okgobMTj1GscWvXJAWdOpWt0nQM2MNXkoMGWBJhShMWiLAd6wZq7Pv18bh0UW+xaSQdHGTn+590EexDycMgoUA==
CORS_ORIGIN=https://dev.bogorjuniorfs.com
```

### Step 4: Install Dependencies

```bash
npm install --production
```

### Step 5: Setup Prisma

```bash
npx prisma generate
```

### Step 6: Start Application

```bash
npm start
# atau
node src/server.js
```

---

## 🔍 CEK KONEKSI DATABASE

### Cara 1: Via Health Check Endpoint

Buka di browser:

```
https://api.bogorjuniorfs.com/health
https://api.bogorjuniorfs.com/db-test
```

### Cara 2: Via SSH/Terminal (jika ada akses)

```bash
cd /home/u702886622/domains/api.bogorjuniorfs.com/public_html
npm run test:db
```

### Cara 3: Cek Log Server

Di Hostinger Panel → Node.js App → View Logs

---

## 📊 MONITORING

### Cek Status Server

```bash
# Health check
curl https://api.bogorjuniorfs.com/health

# Database check
curl https://api.bogorjuniorfs.com/db-test

# Test API endpoint
curl https://api.bogorjuniorfs.com/api/public/stats
```

### Cek Log Errors

Di Hostinger:

1. Login → hPanel
2. Advanced → Node.js App
3. Klik aplikasi Anda
4. Lihat "Error Log" dan "Access Log"

---

## 🛠️ TROUBLESHOOTING

### Error: "Cannot find module 'dotenv'"

```bash
npm install dotenv
```

### Error: "Port 3000 already in use"

Ubah PORT di .env atau di Hostinger Panel

### Error: "ECONNREFUSED" atau "ER_ACCESS_DENIED_ERROR"

- Cek kredensial database
- Pastikan MySQL service running
- Test koneksi database secara manual

### Server Restart Terus-menerus

1. Cek log error di Hostinger Panel
2. Pastikan .env ada dan valid
3. Test database connection
4. Disable auto-restart sementara untuk debug

---

## 📞 KONTAK SUPPORT

Jika masih error, screenshot:

1. Error log dari Hostinger Panel
2. Output dari `/health` endpoint
3. Output dari `/db-test` endpoint
4. File .env (TUTUP PASSWORD!)
