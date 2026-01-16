import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all hero images (admin)
export const listHeroImages = async (req, res) => {
  try {
    const heroImages = await prisma.hero_gallery.findMany({
      orderBy: {
        display_order: 'asc'
      }
    });

    res.json({
      success: true,
      data: heroImages
    });
  } catch (error) {
    console.error('Error fetching hero images:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// Get active hero images (public)
export const listActiveHeroImages = async (req, res) => {
  try {
    const heroImages = await prisma.hero_gallery.findMany({
      where: {
        is_active: true
      },
      orderBy: {
        display_order: 'asc'
      }
    });

    // Add APP_URL to image paths
    const appUrl = process.env.APP_URL || '';
    const imagesWithUrls = heroImages.map(image => ({
      ...image,
      image_path: appUrl + image.image_path
    }));

    res.json({
      success: true,
      data: imagesWithUrls
    });
  } catch (error) {
    console.error('Error fetching active hero images:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// Create hero image
export const createHeroImage = async (req, res) => {
  try {
    const { image_path, display_order = 0, is_active = true } = req.body;

    if (!image_path) {
      return res.status(400).json({
        success: false,
        message: 'Image path is required'
      });
    }

    const id = uuidv4();

    const heroImage = await prisma.hero_gallery.create({
      data: {
        id,
        image_path,
        display_order: parseInt(display_order),
        is_active: Boolean(is_active)
      }
    });

    res.json({
      success: true,
      message: 'Hero image created successfully',
      id: heroImage.id
    });
  } catch (error) {
    console.error('Error creating hero image:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// Update hero image
export const updateHeroImage = async (req, res) => {
  try {
    const { id, image_path, display_order = 0, is_active = true } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required'
      });
    }

    await prisma.hero_gallery.update({
      where: { id },
      data: {
        image_path,
        display_order: parseInt(display_order),
        is_active: Boolean(is_active)
      }
    });

    res.json({
      success: true,
      message: 'Hero image updated successfully'
    });
  } catch (error) {
    console.error('Error updating hero image:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// Delete hero image
export const deleteHeroImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required'
      });
    }

    // Get image path to delete file
    const hero = await prisma.hero_gallery.findUnique({
      where: { id }
    });

    if (!hero) {
      return res.status(404).json({
        success: false,
        message: 'Hero image not found'
      });
    }

    // Delete from database
    await prisma.hero_gallery.delete({
      where: { id }
    });

    // Delete file if it's uploaded (not default image)
    if (hero.image_path && !hero.image_path.startsWith('/lp-')) {
      const fileName = path.basename(hero.image_path);
      const filePath = path.join(__dirname, '../../uploads/hero', fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: 'Hero image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    res.status(500).json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
};

// Upload hero image
export const uploadHeroImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    const file = req.file;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      // Delete the uploaded file
      fs.unlinkSync(file.path);
      
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum 5MB allowed'
      });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Delete the uploaded file
      fs.unlinkSync(file.path);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP allowed',
        debug: {
          mime_type: file.mimetype
        }
      });
    }

    // File is already saved by multer, just return the path
    const imagePath = `/uploads/hero/${file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image_path: imagePath
    });
  } catch (error) {
    console.error('Error uploading hero image:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message
    });
  }
};
