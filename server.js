const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Ensure required environment variables are set
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)');
  process.env.JWT_SECRET = 'default-jwt-secret-change-in-production';
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
// Configure helmet for development vs production
app.use(helmet({
  crossOriginOpenerPolicy: process.env.NODE_ENV === 'production' 
    ? { policy: "same-origin" } 
    : false, // Disable COOP in development to avoid warnings over HTTP
  contentSecurityPolicy: process.env.NODE_ENV === 'production' 
    ? undefined 
    : false // Disable CSP in development for easier debugging
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const adminRoutes = require('./src/routes/admin');
const attendeeRoutes = require('./src/routes/attendee');
const authRoutes = require('./src/routes/auth');

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/attendee', attendeeRoutes);
app.use('/api/auth', authRoutes);

// Serve static files (must come after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin interface
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve attendee interface (only for valid token patterns, not file extensions)
app.get('/event/:token([a-f0-9-]{36})', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'attendee.html'));
});

// Root redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Digital Gift Table server running on port ${PORT}`);
  console.log(`📱 Admin interface: http://localhost:${PORT}/admin`);
  console.log(`🎁 Attendee interface: http://localhost:${PORT}/event/[token]`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api/`);
});

module.exports = app;
