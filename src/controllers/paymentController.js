import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin upload payment for member (auto-approved)
export const uploadPaymentForMember = async (req, res) => {
  try {
    const {
      member_id,
      month,
      year,
      payment_date
    } = req.body;

    // Validate input
    if (!member_id || !month || !year || !payment_date) {
      return res.status(400).json({
        message: 'Data tidak lengkap. Tanggal pembayaran wajib diisi.'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'File bukti pembayaran diperlukan.'
      });
    }

    // Get member info
    const member = await prisma.members.findUnique({
      where: { id: member_id },
      select: { full_name: true }
    });

    if (!member) {
      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Profil member tidak ditemukan.' });
    }

    // Create folder for member proofs
    const folderName = member.full_name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uploadDir = path.join(__dirname, '../../uploads/proofs', folderName);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move file to member-specific folder
    const extension = path.extname(req.file.originalname);
    const newFilename = `${member_id}_${year}-${month}${extension}`;
    const destination = path.join(uploadDir, newFilename);
    
    fs.renameSync(req.file.path, destination);
    
    const proofPath = `/uploads/proofs/${folderName}/${newFilename}`;

    // Use transaction
    await prisma.$transaction(async (tx) => {
      // Upsert payment proof (auto-approved)
      await tx.payment_proofs.upsert({
        where: {
          member_id_payment_month_payment_year: {
            member_id,
            payment_month: parseInt(month),
            payment_year: parseInt(year)
          }
        },
        update: {
          proof_url: proofPath,
          status: 'approved',
          verified_by: req.user.id
        },
        create: {
          member_id,
          payment_month: parseInt(month),
          payment_year: parseInt(year),
          proof_url: proofPath,
          status: 'approved',
          verified_by: req.user.id
        }
      });

      // Update last payment date
      await tx.members.update({
        where: { id: member_id },
        data: {
          last_payment_date: new Date(payment_date)
        }
      });
    });

    res.status(201).json({
      message: 'Bukti pembayaran berhasil diunggah dan otomatis disetujui.'
    });
  } catch (error) {
    console.error('Error uploading payment for member:', error);
    
    // Clean up file if exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: error.message || 'Gagal mengunggah bukti pembayaran.' });
  }
};

// Verify payment (approve/reject)
export const verifyPayment = async (req, res) => {
  try {
    const { proof_id, status } = req.body;

    // Validate input
    if (!proof_id || !status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Data tidak valid.' });
    }

    await prisma.$transaction(async (tx) => {
      // Update payment proof status
      await tx.payment_proofs.update({
        where: { id: parseInt(proof_id) },
        data: {
          status,
          verified_by: req.user.id
        }
      });

      // If approved, update member's last payment date
      if (status === 'approved') {
        const proof = await tx.payment_proofs.findUnique({
          where: { id: parseInt(proof_id) },
          select: { member_id: true }
        });

        if (proof) {
          await tx.members.update({
            where: { id: proof.member_id },
            data: {
              last_payment_date: new Date()
            }
          });
        }
      }
    });

    res.json({ message: 'Status pembayaran berhasil diperbarui.' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Gagal memverifikasi pembayaran.' });
  }
};
