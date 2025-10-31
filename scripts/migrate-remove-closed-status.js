const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'gift_table.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration to remove "closed" status and add "archived"...');

db.serialize(() => {
  // Start transaction
  db.run('BEGIN TRANSACTION');

  // Step 1: Create new events table with updated CHECK constraint
  db.run(`
    CREATE TABLE events_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      description TEXT,
      gift_receiver_name TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      closed_at DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    console.log('✓ Created new events table with updated constraint');
  });

  // Step 2: Copy data from old table, converting 'closed' to 'archived'
  db.run(`
    INSERT INTO events_new (id, subject, description, gift_receiver_name, status, created_at, updated_at, published_at, closed_at)
    SELECT 
      id, 
      subject, 
      description, 
      gift_receiver_name, 
      CASE 
        WHEN status = 'closed' THEN 'archived'
        ELSE status 
      END as status,
      created_at, 
      updated_at, 
      published_at, 
      closed_at
    FROM events
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    console.log('✓ Copied data from old table (converted "closed" to "archived")');
  });

  // Step 3: Drop old table
  db.run('DROP TABLE events', (err) => {
    if (err) {
      console.error('Error dropping old table:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    console.log('✓ Dropped old events table');
  });

  // Step 4: Rename new table to events
  db.run('ALTER TABLE events_new RENAME TO events', (err) => {
    if (err) {
      console.error('Error renaming table:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    console.log('✓ Renamed new table to events');
  });

  // Step 5: Recreate indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)', (err) => {
    if (err) {
      console.error('Error creating index:', err);
      db.run('ROLLBACK');
      db.close();
      return;
    }
    console.log('✓ Recreated index on status column');
  });

  // Commit transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('   - "closed" status has been removed');
      console.log('   - All "closed" events have been converted to "archived"');
      console.log('   - New valid statuses: draft, published, archived');
    }
    db.close();
  });
});

