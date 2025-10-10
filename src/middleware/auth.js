const jwt = require('jsonwebtoken');
const db = require('../models/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authenticateAttendee = async (req, res, next) => {
  const { token } = req.params;
  
  if (!token) {
    return res.status(400).json({ error: 'Attendee token required' });
  }

  try {
    const attendee = await db.get(
      'SELECT * FROM attendees WHERE unique_token = ?',
      [token]
    );

    if (!attendee) {
      return res.status(404).json({ error: 'Invalid attendee token' });
    }

    req.attendee = attendee;
    next();
  } catch (error) {
    console.error('Error authenticating attendee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  authenticateAttendee
};
