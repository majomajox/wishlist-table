const db = require('./database');

class Event {
  static async create(eventData) {
    const { subject, description, gift_receiver_name, status = 'draft' } = eventData;
    console.log('Creating event with status:', status);
    const sql = `
      INSERT INTO events (subject, description, gift_receiver_name, status)
      VALUES (?, ?, ?, ?)
    `;
    const result = await db.run(sql, [subject, description, gift_receiver_name, status]);
    console.log('Event created with ID:', result.id);
    return result;
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
    
    // If status is not provided, fetch current status from database
    let finalStatus = status;
    if (status === undefined || status === null) {
      const currentEvent = await this.findById(id);
      finalStatus = currentEvent ? currentEvent.status : 'draft';
    }
    
    const sql = `
      UPDATE events 
      SET subject = ?, description = ?, gift_receiver_name = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [subject, description, gift_receiver_name, finalStatus, id]);
  }

  static async publish(id) {
    const sql = `
      UPDATE events 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async setDraft(id) {
    const sql = `
      UPDATE events 
      SET status = 'draft', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async archive(id) {
    const sql = `
      UPDATE events 
      SET status = 'archived', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async clone(id) {
    // Get original event
    const originalEvent = await this.findById(id);
    if (!originalEvent) {
      throw new Error('Event not found');
    }

    // Create new event with same details but as draft
    const cloneResult = await this.create({
      subject: `${originalEvent.subject} (Copy)`,
      description: originalEvent.description,
      gift_receiver_name: originalEvent.gift_receiver_name,
      status: 'draft'
    });

    // Get attendees from original event
    const attendees = await db.query(
      'SELECT name, email FROM attendees WHERE event_id = ?',
      [id]
    );

    // Copy attendees to cloned event
    if (attendees && attendees.length > 0) {
      const Attendee = require('./Attendee');
      await Attendee.bulkCreate(cloneResult.id, attendees);
    }

    return cloneResult.id;
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
