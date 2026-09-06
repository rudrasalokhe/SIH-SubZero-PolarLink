const { v4: uuidv4 } = require('uuid');
const Personnel = require('../models/Personnel');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// Roles that anyone can self-register as
const SELF_REGISTER_ROLES = ['scientist', 'engineer', 'medic', 'logistics'];

// Roles that only hq_admin can assign (via promote endpoint)
const PRIVILEGED_ROLES = ['commander', 'hq_admin'];

/**
 * @desc Register a new expedition personnel member
 * @route POST /api/auth/register
 * @access Public
 * @note Self-registration supports all operational and command roles.
 *       If an account already exists for the email, its credentials and role are updated.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, stationId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password for registration',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const VALID_ROLES = ['scientist', 'engineer', 'medic', 'logistics', 'commander', 'hq_admin'];
    const assignedRole = VALID_ROLES.includes(role) ? role : 'scientist';

    const defaultStation = assignedRole === 'hq_admin' ? 'hq-mainland-goa' : 'station-alpha';
    const chosenStation = stationId ? stationId.trim() : defaultStation;

    const passwordHash = await hashPassword(password);

    // Check if account already exists
    let personnel = await Personnel.findOne({ email: cleanEmail });

    if (personnel) {
      // Update existing account credentials, role & station
      personnel.name = name.trim();
      personnel.passwordHash = passwordHash;
      personnel.role = assignedRole;
      if (chosenStation) {
        personnel.currentLocation = personnel.currentLocation || {};
        personnel.currentLocation.stationId = chosenStation;
      }
      personnel._deleted = false;
      personnel._lastModified = new Date();
      await personnel.save();
    } else {
      const personnelId = `pers-${assignedRole}-${uuidv4().substring(0, 8)}`;
      personnel = await Personnel.create({
        personnelId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
        medicalClearance: {
          status: 'cleared',
          lastCheckupDate: new Date(),
          conditions: [],
          bloodGroup: 'Unknown',
        },
        currentLocation: {
          stationId: chosenStation,
          lastCheckIn: new Date(),
        },
        emergencyContact: {
          name: 'Not Provided',
          relation: 'N/A',
          phone: 'N/A',
        },
        sosStatus: 'safe',
        _synced: false,
        _lastModified: new Date(),
        _deleted: false,
      });
    }

    const token = generateToken(personnel);

    const userPayload = {
      personnelId: personnel.personnelId,
      name: personnel.name,
      email: personnel.email,
      role: personnel.role,
      stationId: personnel.currentLocation?.stationId || defaultStation,
    };

    res.status(201).json({
      success: true,
      data: {
        token,
        ...userPayload,
        user: userPayload,
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
    const user = await Personnel.findOne({
      email: trimmedEmail,
      _deleted: false,
    });

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

    const userPayload = {
      personnelId: user.personnelId,
      name: user.name,
      email: user.email,
      role: user.role,
      stationId: user.currentLocation?.stationId || 'station-alpha',
    };

    res.status(200).json({
      success: true,
      data: {
        token,
        ...userPayload,
        user: userPayload,
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

/**
 * @desc Promote a user's role (commander / hq_admin)
 * @route PUT /api/auth/promote/:personnelId
 * @access Private (hq_admin only — enforced via route middleware)
 */
const promoteUser = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { role: newRole } = req.body;

    const validRoles = [...SELF_REGISTER_ROLES, ...PRIVILEGED_ROLES];
    if (!newRole || !validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed: ${validRoles.join(', ')}`,
      });
    }

    const user = await Personnel.findOne({ personnelId, _deleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Personnel '${personnelId}' not found`,
      });
    }

    const oldRole = user.role;
    user.role = newRole;
    user._lastModified = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        personnelId: user.personnelId,
        name: user.name,
        email: user.email,
        oldRole,
        newRole: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  promoteUser,
};
