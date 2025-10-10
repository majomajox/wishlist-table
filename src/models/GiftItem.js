const db = require('./database');

class GiftItem {
  static async create(giftData) {
    const { event_id, name, price, store_urls } = giftData;
    const storeUrlsJson = JSON.stringify(store_urls || []);
    const sql = `
      INSERT INTO gift_items (event_id, name, price, store_urls)
      VALUES (?, ?, ?, ?)
    `;
    return await db.run(sql, [event_id, name, price, storeUrlsJson]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM gift_items WHERE id = ?';
    const item = await db.get(sql, [id]);
    if (item && item.store_urls) {
      try {
        item.store_urls = JSON.parse(item.store_urls);
      } catch (error) {
        console.error('Error parsing store_urls for gift item', id, ':', error);
        item.store_urls = [];
      }
    }
    return item;
  }

  static async findByEventId(eventId) {
    const sql = `
      SELECT g.*, a.name as selected_by_name, a.email as selected_by_email
      FROM gift_items g
      LEFT JOIN attendees a ON g.selected_by_attendee_id = a.id
      WHERE g.event_id = ?
      ORDER BY g.created_at
    `;
    const items = await db.query(sql, [eventId]);
    return items.map(item => {
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
  }

  static async update(id, giftData) {
    const { name, price, store_urls } = giftData;
    const storeUrlsJson = JSON.stringify(store_urls || []);
    const sql = `
      UPDATE gift_items 
      SET name = ?, price = ?, store_urls = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [name, price, storeUrlsJson, id]);
  }

  static async select(id, attendeeId) {
    const sql = `
      UPDATE gift_items 
      SET selected_by_attendee_id = ?, selected_at = CURRENT_TIMESTAMP
      WHERE id = ? AND selected_by_attendee_id IS NULL
    `;
    return await db.run(sql, [attendeeId, id]);
  }

  static async unselect(id) {
    const sql = `
      UPDATE gift_items 
      SET selected_by_attendee_id = NULL, selected_at = NULL
      WHERE id = ?
    `;
    return await db.run(sql, [id]);
  }

  static async delete(id) {
    const sql = 'DELETE FROM gift_items WHERE id = ?';
    return await db.run(sql, [id]);
  }

  static async isSelected(id) {
    const sql = 'SELECT selected_by_attendee_id FROM gift_items WHERE id = ?';
    const result = await db.get(sql, [id]);
    return result ? result.selected_by_attendee_id !== null : false;
  }

  static async getSelectedByAttendee(attendeeId, eventId) {
    const sql = `
      SELECT g.*, a.name as selected_by_name
      FROM gift_items g
      LEFT JOIN attendees a ON g.selected_by_attendee_id = a.id
      WHERE g.event_id = ? AND g.selected_by_attendee_id = ?
      ORDER BY g.selected_at
    `;
    const items = await db.query(sql, [eventId, attendeeId]);
    return items.map(item => {
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
  }
}

module.exports = GiftItem;
