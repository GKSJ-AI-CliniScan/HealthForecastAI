const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token missing',
        });
      }

      // Handle legacy mock token strings from previous frontend tests
      if (token.includes('mockToken_')) {
        const match = token.match(/mockToken_for_([a-zA-Z0-9-]+)_only/);
        const roleFromToken = match ? match[1] : 'doctor';
        req.user = await User.findOne({ role: roleFromToken }).select('-password');
      } else {
        // Standard JWT verification
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'healthforecast_super_secret_jwt_key_2026_secure'
        );
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
          req.user = await User.findOne({ userId: decoded.userId || decoded.id }).select('-password');
        }
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user profile not found for this session',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token expired or invalid',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, authorization header missing',
    });
  }
};

// Grant access to specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
