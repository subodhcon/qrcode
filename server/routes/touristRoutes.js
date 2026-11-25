import { Router } from 'express';
import multer from 'multer';
import {
  registerTourist,
  getTourists,
  getTouristById,
  updateTouristStatus,
  deleteTourist
} from '../controllers/touristController.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Configure Multer with memory storage so buffers can be streamed to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max limit
  },
  fileFilter
});

const uploadFields = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idCardPhoto', maxCount: 1 }
]);

// Tourist Registration & Management Endpoints
router.post('/register', requireAuth, uploadFields, registerTourist);
router.get('/', requireAuth, getTourists);
router.get('/:id', apiLimiter, optionalAuth, getTouristById);
router.put('/:id/status', requireAuth, updateTouristStatus);
router.delete('/:id', requireAuth, deleteTourist);

export default router;
