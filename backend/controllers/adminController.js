const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Dataset = require('../models/Dataset');
const { logSystemAction } = require('../middleware/auditMiddleware');

// @desc    Get system dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private (System Admin)
const getSystemStats = async (req, res) => {
  try {
    const [usersCount, datasetsCount, logsCount, recentLogs] = await Promise.all([
      User.countDocuments(),
      Dataset.countDocuments(),
      AuditLog.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        usersCount,
        modelsCount: 4,
        datasetsCount,
        logsCount,
        recentLogs: recentLogs.map((l) => ({
          id: l.id,
          user: l.user,
          role: l.role,
          action: l.action,
          timestamp: l.timestamp.split(' ')[1] || l.timestamp,
          details: `${l.module} - status: ${l.status}`,
        })),
      },
    });
  } catch (error) {
    console.error('[Admin Controller] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving system stats',
    });
  }
};

// @desc    Get all users list
// @route   GET /api/v1/admin/users
// @access  Private (System Admin)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const formatted = users.map((u) => ({
      id: u.userId || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      specialty: u.specialty,
      department: u.department,
      hospitalBranch: u.hospitalBranch,
      institution: u.institution,
      clearance: u.clearance,
      avatar: u.avatar,
      active: u.active !== false,
      status: u.active === false ? 'Suspended' : 'Active',
      createdAt: u.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving users',
    });
  }
};

// @desc    Create new user by admin
// @route   POST /api/v1/admin/users
// @access  Private (System Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, specialty, department, hospitalBranch, institution, clearance } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const count = await User.countDocuments();
    const userId = `U-${count + 101}`;

    const user = await User.create({
      userId,
      name,
      email: email.toLowerCase().trim(),
      password: password || 'password123',
      role: role || 'doctor',
      specialty,
      department,
      hospitalBranch,
      institution,
      clearance,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    });

    await logSystemAction(
      req.user ? req.user.name : 'System Admin',
      `Created new user ${user.name} with role ${user.role}`,
      'User Management',
      'Success',
      req.ip
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: 'Active',
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create user',
    });
  }
};

// @desc    Toggle user status (Active / Suspended)
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private (System Admin)
const toggleUserStatus = async (req, res) => {
  try {
    const paramId = req.params.id;
    let user = await User.findOne({ userId: paramId });
    if (!user && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(paramId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.active = !user.active;
    await user.save();

    await logSystemAction(
      req.user ? req.user.name : 'System Admin',
      `${user.active ? 'Activated' : 'Deactivated'} User account ${user.name} (${user.role})`,
      'User Management',
      'Success',
      req.ip
    );

    const allUsers = await User.find().select('-password');
    res.json({
      success: true,
      data: allUsers.map((u) => ({
        id: u.userId || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active !== false,
        status: u.active === false ? 'Suspended' : 'Active',
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating user status',
    });
  }
};

// @desc    Update user role
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private (System Admin)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const paramId = req.params.id;

    let user = await User.findOne({ userId: paramId });
    if (!user && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(paramId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logSystemAction(
      req.user ? req.user.name : 'System Admin',
      `Reassigned role of ${user.name} from ${oldRole} to ${role}`,
      'User Management',
      'Success',
      req.ip
    );

    res.json({
      success: true,
      data: {
        id: user.userId || user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating user role',
    });
  }
};

// @desc    Get audit logs
// @route   GET /api/v1/admin/audit-logs
// @access  Private (System Admin)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving audit logs',
    });
  }
};

// @desc    Get Datasets registry
// @route   GET /api/v1/admin/datasets
// @access  Private (System Admin, Researcher)
const getDatasets = async (req, res) => {
  try {
    const datasets = await Dataset.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: datasets.length,
      data: datasets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving datasets',
    });
  }
};

// @desc    Upload / register dataset
// @route   POST /api/v1/admin/datasets
// @access  Private (System Admin, Researcher)
const uploadDataset = async (req, res) => {
  try {
    const { name, recordsCount, format } = req.body;
    const count = await Dataset.countDocuments();
    const datasetId = `D-${new Date().getFullYear()}-${String.fromCharCode(65 + count)}`;

    const newDataset = await Dataset.create({
      id: datasetId,
      name,
      version: 'v1.0',
      recordsCount: recordsCount || 101766,
      format: format || 'CSV',
      status: 'Active',
      lastUpdated: new Date().toISOString().slice(0, 10),
    });

    await logSystemAction(
      req.user ? req.user.name : 'System Admin',
      `Uploaded and validated medical dataset: ${newDataset.name}`,
      'Dataset Management',
      'Success',
      req.ip
    );

    res.status(201).json({
      success: true,
      data: newDataset,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload dataset',
    });
  }
};

module.exports = {
  getSystemStats,
  getUsers,
  createUser,
  toggleUserStatus,
  updateUserRole,
  getAuditLogs,
  getDatasets,
  uploadDataset,
};
