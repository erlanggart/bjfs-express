# Deployment Checklist - Hostinger Production

## Pre-Deployment

### Database Setup
- [ ] Database MySQL sudah dibuat di hPanel
- [ ] Username database sudah dibuat
- [ ] User sudah di-assign ke database dengan All Privileges
- [ ] Detail koneksi sudah dicatat:
  - `DB_HOST`: ________________
  - `DB_NAME`: ________________
  - `DB_USER`: ________________
  - `DB_PASSWORD`: ________________
  - `DB_PORT`: 3306

### Database Migration
- [ ] Export database lokal: `mysqldump -u root -p bogorjuniorfs > backup.sql`
- [ ] Import ke Hostinger via phpMyAdmin
- [ ] Verifikasi semua tabel sudah ada
- [ ] Cek data sample sudah terimport

### Environment Variables
- [ ] JWT_SECRET di-generate (jangan gunakan default!)
  - Run: `./scripts/generate-jwt-secret.sh`
  - Copy hasil ke environment variables
- [ ] CORS_ORIGIN diset ke domain frontend production
- [ ] NODE_ENV=production
- [ ] Database credentials sudah benar
- [ ] UPLOAD_PATH diset ke absolute path di server

### Security
- [ ] File `.env` ada di `.gitignore`
- [ ] Password database kuat dan unik
- [ ] JWT_SECRET minimum 64 karakter random
- [ ] Tidak ada credentials di kode
- [ ] Error messages tidak expose sistem

## Deployment Steps

### 1. Upload Kode
- [ ] Push ke GitHub: `git push origin main`
- [ ] Connect Git repository di Hostinger Node.js App
- [ ] Pilih branch `main`
- [ ] Deploy

### 2. Setup Environment
- [ ] Masuk hPanel → Node.js App → Edit
- [ ] Tambah semua environment variables (lihat .env.example)
- [ ] Save environment variables

### 3. Install Dependencies
- [ ] SSH ke server atau gunakan terminal hPanel
- [ ] Run: `npm install --production`
- [ ] Verifikasi tidak ada error

### 4. Setup Folders
- [ ] Buat folder uploads:
  ```bash
  mkdir -p uploads/{articles,avatars,content,documents,hero,matches,proofs,signatures}
  ```
- [ ] Set permissions: `chmod -R 755 uploads`

### 5. Restart & Test
- [ ] Restart aplikasi Node.js di hPanel
- [ ] Tunggu 30-60 detik
- [ ] Cek logs untuk "Database connected successfully"

## Post-Deployment Testing

### Health Check
- [ ] Test endpoint: `curl https://api.bogorjuniorfs.com/health`
- [ ] Response status 200 OK
- [ ] Uptime > 0

### Authentication
- [ ] Test login: `POST /api/auth/login`
- [ ] Dapat JWT token
- [ ] Token bisa digunakan untuk authenticated endpoints

### Database Operations
- [ ] Test GET endpoints (branches, schedules, dll)
- [ ] Test POST endpoints (create member, dll)
- [ ] Test PUT/PATCH endpoints (update profile)
- [ ] Test DELETE endpoints (remove admin)

### File Uploads
- [ ] Test upload bukti pembayaran
- [ ] File tersimpan di folder uploads yang benar
- [ ] URL file bisa diakses
- [ ] File dengan nama yang sama tidak overwrite

### Frontend Integration
- [ ] Update frontend .env dengan API URL production
- [ ] Build frontend: `npm run build`
- [ ] Deploy frontend ke public_html
- [ ] Test login dari frontend
- [ ] Test semua fitur utama

## Monitoring Setup

### Immediate Checks (First 24 Hours)
- [ ] Cek logs setiap 2 jam
- [ ] Monitor CPU & Memory usage
- [ ] Test dari berbagai device/network
- [ ] Collect user feedback

### Regular Maintenance
- [ ] Setup weekly database backup
- [ ] Monitor disk space usage
- [ ] Review error logs weekly
- [ ] Update dependencies monthly

## Rollback Plan

### If Deployment Fails:
1. [ ] Revert Git to previous commit
2. [ ] Redeploy dari hPanel
3. [ ] Restore database backup jika perlu
4. [ ] Clear cache/restart app
5. [ ] Verify old version works

### Backup Locations:
- Database backup: ________________
- Last working commit: ________________
- Environment variables backup: ________________

## Support Contacts

- **Hostinger Support**: 24/7 Live Chat di hPanel
- **Technical Issues**: support@hostinger.com
- **Knowledge Base**: https://support.hostinger.com

## Notes

Tanggal deployment: ________________
Deployed by: ________________
Commit hash: ________________
Issues encountered: ________________

---

**Status:** 
- [ ] Pre-deployment complete
- [ ] Deployment successful
- [ ] Post-deployment testing passed
- [ ] Production ready ✅
