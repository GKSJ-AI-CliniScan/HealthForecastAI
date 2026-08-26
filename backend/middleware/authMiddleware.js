const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for authentication');
  }
  return process.env.JWT_SECRET;
};

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

      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        req.user = await User.findOne({ userId: decoded.userId || decoded.id }).select('-password');
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user profile not found for this session',
        });
      }

      next();
    } catch (error) {
      if (error.message === 'JWT_SECRET is required for authentication') {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
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
