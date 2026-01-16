import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDirs = [
  'uploads/avatars',
  'uploads/documents',
  'uploads/hero',
  'uploads/content',
  'uploads/articles',
  'uploads/matches',
  'uploads/proofs',
  'uploads/signatures',
];

uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get upload type from request or default to 'documents'
    const uploadType = req.body.uploadType || req.query.uploadType || 'documents';
    const dest = path.join(__dirname, '../../uploads', uploadType);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX are allowed.'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // Default 5MB
  },
});

// Specific upload middleware for different types
export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/avatars'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
});

export const uploadDocument = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/documents'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
});

export const uploadHero = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/hero'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
      cb(null, `hero_${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are allowed for hero images'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for hero images
});

export const uploadSignature = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/signatures'));
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id || 'unknown';
      const timestamp = Date.now();
      cb(null, `sig_${userId}_${timestamp}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Hanya JPG atau PNG.'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for signatures
});

export const uploadPaymentProof = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../uploads/proofs');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomString = Math.round(Math.random() * 1e9);
      cb(null, `proof_${timestamp}_${randomString}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Hanya JPG, PNG, atau PDF.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for payment proofs
});
