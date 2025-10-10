const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Create .env file
const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./database/gift_table.db

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

# Email Configuration (for notifications) - Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Digital Gift Table

# Application URLs
BASE_URL=http://localhost:3000
ADMIN_URL=http://localhost:3000/admin
ATTENDEE_URL=http://localhost:3000/event
`;

const envPath = path.join(__dirname, '..', '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('🔐 JWT secret generated and configured');
  console.log('📧 Email configuration is optional - edit .env to configure');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npm run init-db');
  console.log('2. Run: npm start');
  console.log('3. Visit: http://localhost:3000/admin');
  console.log('4. Login with: admin / admin123');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.log('');
  console.log('Manual setup:');
  console.log('1. Copy env.example to .env');
  console.log('2. Edit .env and set JWT_SECRET to a secure random string');
  console.log('3. Run: npm run init-db');
  console.log('4. Run: npm start');
}

