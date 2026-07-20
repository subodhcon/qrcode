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
export const list = async (req, res) => {
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

    res.json({ total, page: Number(page), limit: Number(limit), items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list QR codes' });
  }
};

/**
 * Create a new QR code (Serverless-compatible, filesystem-free).
 */
export const create = async (req, res) => {
  const { title, data, locationId } = req.body;
  if (!title || !data) return res.status(400).json({ error: 'title and data are required' });
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  const fileName = `${slug}.png`;
  const filePath = path.join(qrImagesDir, fileName);
  try {
    // Attempt local write for legacy systems, but do not fail if read-only
    try {
      const pngBuffer = await QRCode.toBuffer(data, { width: 300, margin: 1 });
      fs.writeFileSync(filePath, pngBuffer);
    } catch (fsErr) {
      console.log('[Info]: Skipping physical file write on serverless environment.');
    }

    const qr = await QRCodeModel.create({
      title,
      slug,
      data,
      imagePath: `/qrcodes/${fileName}`,
      locationId
    });
    res.status(201).json(qr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

/**
 * Update an existing QR code.
 */
export const update = async (req, res) => {
  const { slug } = req.params;
  const { title, data, locationId } = req.body;
  try {
    const updated = await QRCodeModel.findOneAndUpdate(
      { slug },
      { title, data, locationId },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'QR not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update QR code' });
  }
};

/**
 * Download QR code PNG (Dynamically generated in-memory, serverless-friendly).
 */
export const download = async (req, res) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) return res.status(404).json({ error: 'QR not found' });

    // Generate PNG buffer dynamically on-the-fly
    const pngBuffer = await QRCode.toBuffer(qr.data, { width: 300, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.png"`);
    return res.send(pngBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download QR code' });
  }
};

/**
 * Soft delete QR code.
 */
export const remove = async (req, res) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOneAndUpdate(
      { slug },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!qr) return res.status(404).json({ error: 'QR not found' });
    res.json(qr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
};

/**
 * Toggle active/inactive status.
 */
export const toggleStatus = async (req, res) => {
  const { slug } = req.params;
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) return res.status(404).json({ error: 'QR not found' });
    const newStatus = qr.status === 'active' ? 'inactive' : 'active';
    const updated = await QRCodeModel.findOneAndUpdate(
      { slug },
      { status: newStatus },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
};

