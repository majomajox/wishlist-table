const db = require('./database');
const { v4: uuidv4 } = require('uuid');

class Attendee {
  static async create(attendeeData) {
    const { event_id, name, email } = attendeeData;
    const unique_token = uuidv4();
    const sql = `
      INSERT INTO attendees (event_id, name, email, unique_token)
      VALUES (?, ?, ?, ?)
    `;
    return await db.run(sql, [event_id, name, email, unique_token]);
  }

  static async findByToken(token) {
    const sql = 'SELECT * FROM attendees WHERE unique_token = ?';
    return await db.get(sql, [token]);
  }

  static async findByEventId(eventId) {
    const sql = 'SELECT * FROM attendees WHERE event_id = ? ORDER BY created_at';
    return await db.query(sql, [eventId]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM attendees WHERE id = ?';
    return await db.get(sql, [id]);
  }

  static async update(id, attendeeData) {
    const { name, email } = attendeeData;
    const sql = `
      UPDATE attendees 
      SET name = ?, email = ?
      WHERE id = ?
    `;
    return await db.run(sql, [name, email, id]);
  }

  static async delete(id) {
    const sql = 'DELETE FROM attendees WHERE id = ?';
    return await db.run(sql, [id]);
  }

  static async bulkCreate(eventId, attendees) {
    const results = [];
    for (const attendee of attendees) {
      const result = await this.create({
        event_id: eventId,
        name: attendee.name,
        email: attendee.email
      });
      results.push(result);
    }
    return results;
  }

  static async getAttendeeWithEvent(token) {
    const sql = `
      SELECT a.*, e.subject, e.description, e.gift_receiver_name, e.status
      FROM attendees a
      JOIN events e ON a.event_id = e.id
      WHERE a.unique_token = ?
    `;
    return await db.get(sql, [token]);
  }
}

module.exports = Attendee;

