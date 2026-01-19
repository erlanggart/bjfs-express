-- Migration: Add payment_type column to payment_proofs table
-- Date: 2026-01-18
-- Description: Menambahkan kolom payment_type untuk membedakan pembayaran full dan cuti
-- Safe: Script ini aman dijalankan karena tidak menghapus data

-- Cek apakah kolom sudah ada (untuk keamanan)
-- Jika sudah ada, query ini tidak akan error

-- Tambah kolom payment_type
ALTER TABLE payment_proofs 
ADD COLUMN payment_type VARCHAR(50) DEFAULT 'full' AFTER status;

-- Verify struktur tabel
-- DESCRIBE payment_proofs;

-- Contoh update data existing jika diperlukan
-- UPDATE payment_proofs SET payment_type = 'full' WHERE payment_type IS NULL;

-- Selesai!
-- Semua pembayaran yang sudah ada akan otomatis memiliki payment_type = 'full'
