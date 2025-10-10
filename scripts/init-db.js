const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'gift_table.db');
const db = new sqlite3.Database(dbPath);

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject TEXT NOT NULL,
          description TEXT,
          gift_receiver_name TEXT NOT NULL,
          status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          closed_at DATETIME
        )
      `);

      // Attendees table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          unique_token TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
        )
      `);

      // Gift items table
      db.run(`
        CREATE TABLE IF NOT EXISTS gift_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          price DECIMAL(10,2),
          store_urls TEXT, -- JSON array of URLs
          selected_by_attendee_id INTEGER,
          selected_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          FOREIGN KEY (selected_by_attendee_id) REFERENCES attendees (id) ON DELETE SET NULL
        )
      `);

      // Admin users table (for authentication)
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Email notifications log
      db.run(`
        CREATE TABLE IF NOT EXISTS email_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          attendee_id INTEGER,
          notification_type TEXT NOT NULL,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'sent',
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          FOREIGN KEY (attendee_id) REFERENCES attendees (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendees_token ON attendees(unique_token)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_gift_items_event_id ON gift_items(event_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_gift_items_selected ON gift_items(selected_by_attendee_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);

      db.run(`PRAGMA foreign_keys = ON`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

// Insert default admin user
const insertDefaultAdmin = () => {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs');
    const defaultPassword = 'admin123'; // Change this in production!
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    db.run(`
      INSERT OR IGNORE INTO admin_users (username, email, password_hash)
      VALUES ('admin', 'admin@example.com', ?)
    `, [hashedPassword], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log('Default admin user created:');
        console.log('Username: admin');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        console.log('⚠️  Please change the default password in production!');
        resolve();
      }
    });
  });
};

// Initialize database
const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    await createTables();
    await insertDefaultAdmin();
    console.log('✅ Database initialized successfully!');
    console.log(`Database location: ${dbPath}`);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
};

initDatabase();

