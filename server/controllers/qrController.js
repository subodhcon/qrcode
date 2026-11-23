import path from 'path';
import fs from 'fs';
import { QRCode as QRCodeModel } from '../models/QRCode.js';
import QRCode from 'qrcode';

const publicDir = path.resolve('public');
const qrImagesDir = path.join(publicDir, 'qrcodes');

// Ensure directory exists - wrapped to prevent failure on read-only serverless filesystems
try {
  if (!fs.existsSync(qrImagesDir)) {
    fs.mkdirSync(qrImagesDir, { recursive: true });
  }
} catch (e) {
  console.warn('[Warning]: Ephemeral filesystem. QR codes will be generated dynamically on-the-fly.', e.message);
}

/**
 * List QR codes with pagination and optional search query.
 */
export const list = async (req, res, next) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  
  const query = { deletedAt: null };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const total = await QRCodeModel.countDocuments(query);
    const items = await QRCodeModel.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total, page: Number(page), limit: Number(limit), items });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new QR code (Serverless-compatible, filesystem-free).
 */
export const create = async (req, res, next) => {
  const { title, data, locationId } = req.body;
  if (!title || !data) {
    return res.status(400).json({ success: false, message: 'title and data are required.' });
  }
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  const fileName = `${slug}.png`;
  const filePath = path.join(qrImagesDir, fileName);
  try {
    // Attempt local write for legacy systems, but do not fail if read-only
    try {
      const pngBuffer = await QRCode.toBuffer(data, { width: 300, margin: 1 });
      fs.writeFileSync(filePath, pngBuffer);
    } catch {
      // Safe skip on serverless / read-only filesystem
    }

    const qr = await QRCodeModel.create({
      title,
      slug,
      data,
      imagePath: `/qrcodes/${fileName}`,
      locationId
    });
    res.status(201).json({ success: true, data: qr });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing QR code.
 */
export const update = async (req, res, next) => {
  const { slug } = req.params;
  const { title, data, locationId } = req.body;
  try {
    const updated = await QRCodeModel.findOneAndUpdate(
      { slug },
      { title, data, locationId },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'QR code not found.' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Download QR code PNG (Dynamically generated in-memory, serverless-friendly).
 */
export const download = async (req, res, next) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR code not found.' });
    }

    // Generate PNG buffer dynamically on-the-fly
    const pngBuffer = await QRCode.toBuffer(qr.data, { width: 300, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.png"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Soft delete QR code.
 */
export const remove = async (req, res, next) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOneAndUpdate(
      { slug },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR code not found.' });
    }
    res.status(200).json({ success: true, message: 'QR code deleted successfully.', data: qr });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle active/inactive status.
 */
export const toggleStatus = async (req, res, next) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR code not found.' });
    }
    const newStatus = qr.status === 'active' ? 'inactive' : 'active';
    const updated = await QRCodeModel.findOneAndUpdate(
      { slug },
      { status: newStatus },
      { new: true }
    );
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
