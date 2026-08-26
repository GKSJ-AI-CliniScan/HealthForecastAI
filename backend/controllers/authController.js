const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logSystemAction } = require('../middleware/auditMiddleware');
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for authentication');
  }
  return process.env.JWT_SECRET;
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify credentials.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your system administrator.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Record failed attempt in audit log
      await logSystemAction(
        user.name || email,
        `Failed login attempt for ${email}`,
        'Authentication',
        'Warning',
        req.ip
      );
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    // Record successful login
    await logSystemAction(
      user,
      `User ${user.name} logged in successfully`,
      'Authentication',
      'Success',
      req.ip
    );

    const userResponse = {
      id: user.userId || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      specialty: user.specialty,
      department: user.department,
      hospitalBranch: user.hospitalBranch,
      institution: user.institution,
      clearance: user.clearance,
      assignedPatientsCount: user.assignedPatientsCount,
    };

    res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('[Auth Controller] Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Private/Admin or Public during setup
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, specialty, department, hospitalBranch, institution, clearance } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const userCount = await User.countDocuments();
    const userId = `U-${userCount + 101}`;

    const user = await User.create({
      userId,
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || 'doctor',
      specialty,
      department,
      hospitalBranch,
      institution,
      clearance,
    });

    const token = generateToken(user);

    await logSystemAction(
      req.user ? req.user.name : user.name,
      `Registered new user account: ${user.name} (${user.role})`,
      'User Management',
      'Success',
      req.ip
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        specialty: user.specialty,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('[Auth Controller] Register Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.userId || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        specialty: user.specialty,
        department: user.department,
        hospitalBranch: user.hospitalBranch,
        institution: user.institution,
        clearance: user.clearance,
        assignedPatientsCount: user.assignedPatientsCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.name = req.body.name || user.name;
    user.avatar = req.body.avatar || user.avatar;
    if (req.body.specialty) user.specialty = req.body.specialty;
    if (req.body.department) user.department = req.body.department;
    if (req.body.hospitalBranch) user.hospitalBranch = req.body.hospitalBranch;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    await logSystemAction(
      user.name,
      `Updated user profile settings for ${user.email}`,
      'Profile Management',
      'Success',
      req.ip
    );

    res.json({
      success: true,
      user: {
        id: updatedUser.userId || updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        specialty: updatedUser.specialty,
        department: updatedUser.department,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

module.exports = {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
};
