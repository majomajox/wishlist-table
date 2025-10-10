const db = require('./database');

class Event {
  static async create(eventData) {
    const { subject, description, gift_receiver_name } = eventData;
    const sql = `
      INSERT INTO events (subject, description, gift_receiver_name)
      VALUES (?, ?, ?)
    `;
    return await db.run(sql, [subject, description, gift_receiver_name]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM events WHERE id = ?';
    return await db.get(sql, [id]);
  }

  static async findAll() {
    const sql = `
      SELECT e.*, 
             COUNT(DISTINCT a.id) as attendee_count,
             COUNT(DISTINCT g.id) as gift_count
      FROM events e
      LEFT JOIN attendees a ON e.id = a.event_id
      LEFT JOIN gift_items g ON e.id = g.event_id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;
    return await db.query(sql);
  }

  static async update(id, eventData) {
    const { subject, description, gift_receiver_name, status } = eventData;
    const sql = `
      UPDATE events 
      SET subject = ?, description = ?, gift_receiver_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [subject, description, gift_receiver_name, status, id]);
  }

  static async publish(id) {
    const sql = `
      UPDATE events 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async close(id) {
    const sql = `
      UPDATE events 
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async delete(id) {
    const sql = 'DELETE FROM events WHERE id = ?';
    return await db.run(sql, [id]);
  }

  static async getEventWithDetails(id) {
    const event = await this.findById(id);
    if (!event) return null;

    // Get attendees
    const attendees = await db.query(
      'SELECT * FROM attendees WHERE event_id = ? ORDER BY created_at',
      [id]
    );

    // Get gift items with selection info
    const giftItems = await db.query(`
      SELECT g.*, a.name as selected_by_name, a.email as selected_by_email
      FROM gift_items g
      LEFT JOIN attendees a ON g.selected_by_attendee_id = a.id
      WHERE g.event_id = ?
      ORDER BY g.created_at
    `, [id]);

    // Parse store_urls JSON for each gift item
    const processedGiftItems = giftItems.map(item => {
      let store_urls = [];
      if (item.store_urls) {
        try {
          store_urls = JSON.parse(item.store_urls);
        } catch (error) {
          console.error('Error parsing store_urls for gift item', item.id, ':', error);
          store_urls = [];
        }
      }
      return {
        ...item,
        store_urls
      };
    });

    return {
      ...event,
      attendees,
      gift_items: processedGiftItems
    };
  }
}

module.exports = Event;
