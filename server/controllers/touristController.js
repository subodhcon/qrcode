import { Tourist } from '../models/Tourist.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import QRCode from 'qrcode';

/**
 * Register a new Tourist (Individual or Group)
 */
export const registerTourist = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      countryCode = '+91',
      emergencyContactName = '',
      emergencyContactPhone,
      emergencyContactRelation = 'Family / Relative',
      address,
      city = '',
      state = '',
      country = 'India',
      idCardType = 'Aadhaar',
      idCardNumber = '',
      type = 'individual',
      groupName = '',
      totalMembers = 1,
      members = '[]',
      visitPurpose = 'Bodh Gaya Pilgrimage / दर्शन'
    } = req.body;

    if (!fullName || !phone || !address || !emergencyContactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Name, Phone, Address, and Emergency Contact are mandatory.'
      });
    }

    // Process Main Tourist Photo
    let photoUrl = '';
    let photoPublicId = '';
    if (req.files?.photo?.[0]) {
      const uploadResult = await uploadImageBuffer(
        req.files.photo[0].buffer,
        'bodhgaya_tourists/photos',
        `photo_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}`
      );
      photoUrl = uploadResult.url;
      photoPublicId = uploadResult.publicId;
    }

    // Process ID Card Photo
    let idCardPhotoUrl = '';
    let idCardPublicId = '';
    if (req.files?.idCardPhoto?.[0]) {
      const uploadResult = await uploadImageBuffer(
        req.files.idCardPhoto[0].buffer,
        'bodhgaya_tourists/idcards',
        `id_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}`
      );
      idCardPhotoUrl = uploadResult.url;
      idCardPublicId = uploadResult.publicId;
    }

    // Parse Group Members if applicable
    let parsedMembers = [];
    if (type === 'group') {
      try {
        parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;
      } catch {
        parsedMembers = [];
      }
    }

    // Generate Unique Registration Pass ID
    const registrationNo = await Tourist.generateRegistrationNo(type);

    const newTourist = new Tourist({
      registrationNo,
      type,
      fullName,
      phone,
      countryCode,
      emergencyContact: {
        name: emergencyContactName,
        phone: emergencyContactPhone,
        relation: emergencyContactRelation
      },
      photoUrl,
      photoPublicId,
      idCardPhotoUrl,
      idCardPublicId,
      idCardType,
      idCardNumber,
      address,
      city,
      state,
      country,
      groupName: type === 'group' ? (groupName || `${fullName}'s Group`) : '',
      totalMembers: type === 'group' ? Math.max(parsedMembers.length + 1, Number(totalMembers) || 1) : 1,
      members: parsedMembers,
      visitPurpose,
      status: 'Active',
      registeredBy: req.user?.username || 'Admin Desk'
    });

    const savedTourist = await newTourist.save();

    // Generate QR Code for pass verification
    const qrPayload = JSON.stringify({
      passId: savedTourist.registrationNo,
      name: savedTourist.fullName,
      type: savedTourist.type,
      phone: `${savedTourist.countryCode} ${savedTourist.phone}`,
      members: savedTourist.totalMembers,
      date: savedTourist.createdAt
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Tourist successfully registered.',
      data: savedTourist,
      qrCodeDataUrl
    });
  } catch (error) {
    console.error('❌ Error in registerTourist:', error);
    next(error);
  }
};

/**
 * Get all registered tourists with filtering, search, and pagination
 */
export const getTourists = async (req, res, next) => {
  try {
    const { search = '', type = 'all', status = 'all', page = 1, limit = 50 } = req.query;

    const query = {};

    if (type !== 'all') {
      query.type = type;
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { registrationNo: regex },
        { fullName: regex },
        { phone: regex },
        { groupName: regex },
        { country: regex },
        { city: regex }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await Tourist.countDocuments(query);
    const tourists = await Tourist.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: tourists
    });
  } catch (error) {
    console.error('❌ Error in getTourists:', error);
    next(error);
  }
};

/**
 * Get single tourist by ID or Registration Number
 */
export const getTouristById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const tourist = isObjectId
      ? await Tourist.findById(id)
      : await Tourist.findOne({ registrationNo: id.toUpperCase() });

    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist pass record not found.'
      });
    }

    // Generate dynamic verification QR Code
    const qrPayload = JSON.stringify({
      passId: tourist.registrationNo,
      name: tourist.fullName,
      type: tourist.type,
      phone: `${tourist.countryCode} ${tourist.phone}`,
      members: tourist.totalMembers,
      date: tourist.createdAt
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2
    });

    return res.status(200).json({
      success: true,
      data: tourist,
      qrCodeDataUrl
    });
  } catch (error) {
    console.error('❌ Error in getTouristById:', error);
    next(error);
  }
};

/**
 * Toggle Tourist Status (Active / Completed / Cancelled)
 */
export const updateTouristStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

    const tourist = await Tourist.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}.`,
      data: tourist
    });
  } catch (error) {
    console.error('❌ Error in updateTouristStatus:', error);
    next(error);
  }
};

/**
 * Delete a Tourist record
 */
export const deleteTourist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tourist = await Tourist.findByIdAndDelete(id);

    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: 'Tourist record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tourist record deleted successfully.'
    });
  } catch (error) {
    console.error('❌ Error in deleteTourist:', error);
    next(error);
  }
};
