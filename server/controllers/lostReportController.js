import LostReport from '../models/LostReport.js';
import { Tourist } from '../models/Tourist.js';

/**
 * Generate a clean unique readable Report ID (e.g. LOST-2601, LOST-2602)
 */
async function generateReportId() {
  const count = await LostReport.countDocuments();
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  let sequence = count + 1;
  let candidate = `LOST-${yearSuffix}${String(sequence).padStart(4, '0')}`;

  while (await LostReport.exists({ reportId: candidate })) {
    sequence += 1;
    candidate = `LOST-${yearSuffix}${String(sequence).padStart(4, '0')}`;
  }
  return candidate;
}

/**
 * Public Endpoint: Register a Lost Pilgrim Assistance Report from a Mela Counter
 */
export const createLostReport = async (req, res, next) => {
  try {
    const {
      passId,
      touristName,
      phone,
      countryCode,
      photoUrl,
      groupName,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      counterNo,
      counterName,
      reportedBy,
      volunteerPhone,
      notes
    } = req.body;

    if (!counterNo || !counterName) {
      return res.status(400).json({
        success: false,
        message: 'Counter number and counter location are required.'
      });
    }

    let resolvedTouristName = (touristName || '').trim();
    let resolvedPhone = (phone || '').trim();
    let resolvedCountryCode = countryCode || '+91';
    let resolvedPhotoUrl = (photoUrl || '').trim();
    let resolvedGroupName = (groupName || '').trim();
    let resolvedEmergencyContact = {
      name: (emergencyContactName || '').trim(),
      phone: (emergencyContactPhone || '').trim(),
      relation: (emergencyContactRelation || '').trim()
    };
    let touristRefId = null;

    // If Pass ID is provided, look up the canonical registered tourist in the database
    if (passId && passId.trim()) {
      const cleanPassId = passId.trim().toUpperCase();
      const matchedTourist = await Tourist.findOne({ registrationNo: cleanPassId });

      if (matchedTourist) {
        touristRefId = matchedTourist._id;
        if (!resolvedTouristName) resolvedTouristName = matchedTourist.fullName;
        if (!resolvedPhone) resolvedPhone = matchedTourist.phone;
        if (matchedTourist.countryCode) resolvedCountryCode = matchedTourist.countryCode;
        if (!resolvedPhotoUrl && matchedTourist.photoUrl) resolvedPhotoUrl = matchedTourist.photoUrl;
        if (!resolvedGroupName && matchedTourist.groupName) resolvedGroupName = matchedTourist.groupName;

        if (!resolvedEmergencyContact.phone && matchedTourist.emergencyContact?.phone) {
          resolvedEmergencyContact = {
            name: matchedTourist.emergencyContact.name || '',
            phone: matchedTourist.emergencyContact.phone || '',
            relation: matchedTourist.emergencyContact.relation || ''
          };
        }
      }
    }

    if (!resolvedTouristName) {
      return res.status(400).json({
        success: false,
        message: 'Tourist / Pilgrim name is required or provide a valid Pass ID.'
      });
    }

    const reportId = await generateReportId();

    const newReport = new LostReport({
      reportId,
      touristId: touristRefId,
      passId: (passId || '').trim().toUpperCase(),
      touristName: resolvedTouristName,
      phone: resolvedPhone,
      countryCode: resolvedCountryCode,
      photoUrl: resolvedPhotoUrl,
      groupName: resolvedGroupName,
      emergencyContact: resolvedEmergencyContact,
      counterNo: Number(counterNo),
      counterName: counterName.trim(),
      reportedBy: (reportedBy || 'Counter Volunteer').trim(),
      volunteerPhone: (volunteerPhone || '').trim(),
      notes: (notes || '').trim(),
      status: 'Reported'
    });

    const savedReport = await newReport.save();

    return res.status(201).json({
      success: true,
      message: 'Lost tourist assistance report successfully registered. Control room notified.',
      data: savedReport
    });
  } catch (error) {
    console.error('❌ Error in createLostReport:', error);
    next(error);
  }
};

/**
 * Superadmin Endpoint: Get all lost reports with optional status filtering
 */
export const getLostReports = async (req, res, next) => {
  try {
    const { status, counterNo, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (counterNo) {
      query.counterNo = Number(counterNo);
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reportId: regex },
        { passId: regex },
        { touristName: regex },
        { phone: regex },
        { groupName: regex },
        { counterName: regex }
      ];
    }

    const reports = await LostReport.find(query).sort({ createdAt: -1 });

    // Calculate quick telemetry stats
    const totalCount = await LostReport.countDocuments();
    const activeCount = await LostReport.countDocuments({ status: { $in: ['Reported', 'Rescue Dispatched'] } });
    const reunitedCount = await LostReport.countDocuments({ status: 'Reunited' });

    return res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        active: activeCount,
        reunited: reunitedCount
      },
      data: reports
    });
  } catch (error) {
    console.error('❌ Error in getLostReports:', error);
    next(error);
  }
};

/**
 * Superadmin Endpoint: Update report status (e.g. Rescue Dispatched, Reunited, Closed)
 */
export const updateLostReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedRescuer } = req.body;

    const validStatuses = ['Reported', 'Rescue Dispatched', 'Reunited', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateFields = { status };
    if (assignedRescuer !== undefined) {
      updateFields.assignedRescuer = assignedRescuer.trim();
    }
    if (status === 'Reunited') {
      updateFields.reunitedAt = new Date();
    }

    const updated = await LostReport.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Lost report not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}.`,
      data: updated
    });
  } catch (error) {
    console.error('❌ Error in updateLostReportStatus:', error);
    next(error);
  }
};

/**
 * Superadmin Endpoint: Delete a lost report
 */
export const deleteLostReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await LostReport.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Lost report not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully.'
    });
  } catch (error) {
    console.error('❌ Error in deleteLostReport:', error);
    next(error);
  }
};
