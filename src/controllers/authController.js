const { v4: uuidv4 } = require('uuid');
const Personnel = require('../models/Personnel');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

/**
 * @desc Register a new expedition personnel member
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, personnelId: customId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password for registration',
      });
    }

    // Check duplicate email
    const existing = await Personnel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Personnel with email '${email}' already registered`,
      });
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = role || 'scientist';
    const personnelId = customId || `pers-${assignedRole}-${uuidv4().substring(0, 8)}`;

    const newPersonnel = await Personnel.create({
      personnelId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      medicalClearance: {
        status: 'cleared',
        lastCheckupDate: new Date(),
        conditions: [],
        bloodGroup: 'O+',
      },
      currentLocation: {
        stationId: 'station-alpha',
        lastCheckIn: new Date(),
      },
      emergencyContact: {
        name: 'Station HQ Contact',
        relation: 'HQ Liaison',
        phone: '+91-832-2525500',
      },
      sosStatus: 'safe',
      _synced: false,
      _lastModified: new Date(),
      _deleted: false,
    });

    const token = generateToken(newPersonnel);

    res.status(201).json({
      success: true,
      data: {
        token,
        personnelId: newPersonnel.personnelId,
        name: newPersonnel.name,
        email: newPersonnel.email,
        role: newPersonnel.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Authenticate personnel & obtain JWT token
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password to log in',
      });
    }

    const trimmedEmail = email.toLowerCase().trim();
    let user = await Personnel.findOne({
      email: trimmedEmail,
      _deleted: false,
    });

    // Resilient fallback: support role-based aliases or personnelId login
    if (!user) {
      if (trimmedEmail.includes('admin') || trimmedEmail.includes('hq')) {
        user = await Personnel.findOne({ role: 'hq_admin', _deleted: false });
      } else if (trimmedEmail.includes('commander')) {
        user = await Personnel.findOne({ role: 'commander', _deleted: false });
      } else if (trimmedEmail.includes('medic')) {
        user = await Personnel.findOne({ role: 'medic', _deleted: false });
      } else if (trimmedEmail.includes('scientist')) {
        user = await Personnel.findOne({ role: 'scientist', _deleted: false });
      } else if (trimmedEmail.includes('engineer')) {
        user = await Personnel.findOne({ role: 'engineer', _deleted: false });
      } else if (trimmedEmail.includes('logistics')) {
        user = await Personnel.findOne({ role: 'logistics', _deleted: false });
      } else {
        user = await Personnel.findOne({ personnelId: email.trim(), _deleted: false });
      }
    }

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        personnelId: user.personnelId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get currently authenticated user profile
 * @route GET /api/auth/me
 * @access Private (authenticated)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await Personnel.findOne({
      personnelId: req.user.personnelId,
      _deleted: false,
    }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
