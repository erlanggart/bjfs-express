# 🛡️ Crash Protection System

## Masalah yang Diselesaikan

Sebelumnya, jika database connection gagal, aplikasi akan:
1. ❌ Crash
2. ❌ Auto-restart oleh Hostinger
3. ❌ Crash lagi (loop)
4. ❌ Resource 100% (CPU/Memory habis)
5. ❌ Website down

## Solusi yang Diimplementasikan

### 1. Circuit Breaker Pattern 🔌

**Cara Kerja:**
- Jika database connection gagal **5 kali**, circuit breaker **OPEN**
- Saat circuit open, aplikasi **berhenti mencoba connect** selama **60 detik**
- Setelah 60 detik, circuit **RESET** dan coba lagi
- Ini **mencegah retry storm** yang menghabiskan resource

**Response saat Circuit Open:**
```json
{
  "status": "Circuit Breaker Open",
  "error": "Database circuit breaker is OPEN. Too many connection failures.",
  "message": "System is protecting itself from resource exhaustion.",
  "retryAfter": 60
}
```

### 2. Global Error Handlers 🚨

**Uncaught Exception Handler:**
- Catch semua error yang tidak ter-handle
- Log error detail untuk debugging
- **Tidak crash aplikasi** (tetap jalan)

**Unhandled Promise Rejection Handler:**
- Catch promise yang reject tanpa `.catch()`
- Log rejection detail
- **Tidak crash aplikasi**

**Graceful Shutdown Handler:**
- Handle `SIGTERM` dan `SIGINT` (Ctrl+C)
- Close HTTP server dengan benar
- Close database connections
- Force exit setelah 10 detik jika masih stuck

### 3. Database Error Handler Middleware 🗄️

Provide **graceful error messages** untuk berbagai jenis database error:

| Error Type | HTTP Status | User Message |
|------------|-------------|--------------|
| Circuit Breaker Open | 503 | Service temporarily unavailable, retry in 60s |
| Connection Failed | 503 | Unable to connect to database, try again later |
| Auth Failed | 500 | Database authentication failed, contact admin |
| Database Not Found | 500 | Database does not exist, contact admin |
| Query Error | 500 | An error occurred (dev: show detail, prod: hide) |

### 4. Non-Blocking Database Test 🧪

- Database connection test **tidak block server startup**
- Server tetap **start** meskipun database gagal
- Test dilakukan **2 detik setelah** server start
- Log yang informatif:
  ```
  ✅ Database connected successfully
  atau
  ❌ Database connection failed: [error message]
  ⚠️  App will continue running but database operations will fail
  💡 Fix: Check environment variables or create .env file on server
  ```

## Monitoring & Logs

### Startup Logs

```bash
🔧 Database Configuration:
  DB_HOST: mysql.hostinger.com
  DB_USER: u702886622_erlangga
  DB_PASSWORD: ***SET***
  DB_NAME: u702886622_bogorjuniorfs
  DB_PORT: 3306
  NODE_ENV: production

🚀 Server running on port 3000
📍 Environment: production
🔗 API URL: http://localhost:3000
🛡️  Crash protection: ENABLED

✅ Database connected successfully
```

### Circuit Breaker Logs

**Saat Connection Gagal:**
```bash
❌ Database connection failed (1/5): Access denied for user 'u702886622_erlangga'@'localhost'
❌ Database connection failed (2/5): Access denied for user 'u702886622_erlangga'@'localhost'
...
❌ Database connection failed (5/5): Access denied for user 'u702886622_erlangga'@'localhost'
🚨 CIRCUIT BREAKER OPEN - Database connection attempts suspended for 60 seconds
⚠️  This prevents resource exhaustion from repeated connection failures
```

**Setelah Timeout:**
```bash
🔄 Circuit breaker reset, trying database connection...
✅ Database connection restored
```

## Testing

### Test Database Connection
```bash
curl https://api.bogorjuniorfs.com/db-test
```

**Response saat Circuit Open:**
```json
{
  "status": "Circuit Breaker Open",
  "error": "Database circuit breaker is OPEN. Too many connection failures. Retry in 45 seconds.",
  "message": "Too many database connection failures...",
  "retryAfter": 60,
  "timestamp": "2026-01-16T10:30:00.000Z"
}
```

**Response saat Database OK:**
```json
{
  "status": "Connected",
  "database": {
    "host": "mysql.hostinger.com",
    "name": "u702886622_bogorjuniorfs",
    "user": "u702886622_erlangga",
    "port": "3306",
    "tableCount": 15,
    "keyTables": ["users", "members", "branches", "attendance", "schedules"],
    "missingTables": []
  },
  "test": "PASS",
  "timestamp": "2026-01-16T10:30:00.000Z"
}
```

## Deployment Checklist

✅ Crash protection sudah aktif
✅ Circuit breaker configured (5 failures, 60s timeout)
✅ Global error handlers registered
✅ Database error middleware available
✅ Graceful shutdown handlers ready
✅ Non-blocking startup test enabled

**Cara Deploy:**
1. Pull latest code dari GitHub
2. Upload `.env.server` sebagai `.env` di server
3. Restart Node.js App
4. Monitor logs untuk konfirmasi proteksi aktif
5. Test `/db-test` endpoint

## Benefit

### Sebelum:
- ❌ Crash loop
- ❌ Resource 100%
- ❌ Website down
- ❌ Perlu manual restart berkali-kali

### Sekarang:
- ✅ Aplikasi tetap jalan meskipun database error
- ✅ Resource usage terkontrol (circuit breaker)
- ✅ Error messages yang informatif
- ✅ Auto-recovery setelah masalah selesai
- ✅ Graceful shutdown saat maintenance

## Troubleshooting

### Jika Circuit Breaker Terbuka:
1. **Check environment variables** di Hostinger panel
2. **Verify database credentials** via phpMyAdmin
3. **Wait 60 seconds** untuk auto-reset
4. **Check logs** untuk detail error
5. **Fix masalah** (env vars, password, database import)
6. **Test lagi** - circuit akan auto-close jika berhasil

### Jika Masih Crash:
1. Check Hostinger **Error Logs**
2. Look for `UNCAUGHT EXCEPTION` atau `UNHANDLED REJECTION`
3. Report error message untuk investigation

## Notes

- Circuit breaker **hanya untuk database connection**, bukan untuk query errors
- Query errors tetap di-handle per-route dengan try-catch
- Middleware `databaseErrorHandler.js` tersedia untuk wrapper routes (opsional)
- Production mode **hide sensitive error details**, development mode show all
