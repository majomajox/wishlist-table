const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const GiftItem = require('../models/GiftItem');
const emailService = require('../utils/emailService');

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);

// Events CRUD
router.get('/events', async (req, res) => {
  try {
    const events = await Event.findAll();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.getEventWithDetails(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

router.post('/events', [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('gift_receiver_name').notEmpty().withMessage('Gift receiver name is required'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array'),
  body('attendees.*.name').optional().notEmpty().withMessage('Attendee name is required'),
  body('attendees.*.email').optional().isEmail().withMessage('Valid attendee email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, description, gift_receiver_name, attendees } = req.body;
    console.log('Creating event with data:', { subject, description, gift_receiver_name, attendees });

    // Create event
    const eventResult = await Event.create({
      subject,
      description,
      gift_receiver_name
    });
    console.log('Event created with ID:', eventResult.id);

    // Create attendees
    if (attendees && attendees.length > 0) {
      console.log('Creating attendees:', attendees);
      await Attendee.bulkCreate(eventResult.id, attendees);
    } else {
      console.log('No attendees to create');
    }

    const event = await Event.getEventWithDetails(eventResult.id);
    console.log('Event with details:', event);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('gift_receiver_name').notEmpty().withMessage('Gift receiver name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, description, gift_receiver_name, status } = req.body;
    
    await Event.update(req.params.id, {
      subject,
      description,
      gift_receiver_name,
      status
    });

    const event = await Event.getEventWithDetails(req.params.id);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.post('/events/:id/publish', async (req, res) => {
  try {
    await Event.publish(req.params.id);
    
    // Send emails to all attendees
    const event = await Event.getEventWithDetails(req.params.id);
    if (event && event.attendees) {
      await emailService.sendEventPublishedEmails(event);
    }

    res.json({ message: 'Event published successfully' });
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).json({ error: 'Failed to publish event' });
  }
});

router.post('/events/:id/draft', async (req, res) => {
  try {
    await Event.setDraft(req.params.id);
    res.json({ message: 'Event set to draft successfully' });
  } catch (error) {
    console.error('Error setting event to draft:', error);
    res.status(500).json({ error: 'Failed to set event to draft' });
  }
});

router.post('/events/:id/archive', async (req, res) => {
  try {
    await Event.archive(req.params.id);
    res.json({ message: 'Event archived successfully' });
  } catch (error) {
    console.error('Error archiving event:', error);
    res.status(500).json({ error: 'Failed to archive event' });
  }
});

router.post('/events/:id/clone', async (req, res) => {
  try {
    const originalEvent = await Event.getEventWithDetails(req.params.id);
    if (!originalEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Clone the event with attendees but without gift items
    const clonedEventId = await Event.clone(req.params.id);
    const clonedEvent = await Event.getEventWithDetails(clonedEventId);
    
    res.json(clonedEvent);
  } catch (error) {
    console.error('Error cloning event:', error);
    res.status(500).json({ error: 'Failed to clone event' });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await Event.delete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Attendees management
router.post('/events/:id/attendees', [
  body('attendees').isArray().withMessage('Attendees must be an array'),
  body('attendees.*.name').notEmpty().withMessage('Attendee name is required'),
  body('attendees.*.email').isEmail().withMessage('Valid attendee email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attendees } = req.body;
    await Attendee.bulkCreate(req.params.id, attendees);

    const event = await Event.getEventWithDetails(req.params.id);
    res.json(event.attendees);
  } catch (error) {
    console.error('Error adding attendees:', error);
    res.status(500).json({ error: 'Failed to add attendees' });
  }
});

router.put('/attendees/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    await Attendee.update(req.params.id, { name, email });

    const attendee = await Attendee.findById(req.params.id);
    res.json(attendee);
  } catch (error) {
    console.error('Error updating attendee:', error);
    res.status(500).json({ error: 'Failed to update attendee' });
  }
});

router.delete('/attendees/:id', async (req, res) => {
  try {
    await Attendee.delete(req.params.id);
    res.json({ message: 'Attendee deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendee:', error);
    res.status(500).json({ error: 'Failed to delete attendee' });
  }
});

// Gift items management
router.get('/events/:id/gift-items', async (req, res) => {
  try {
    const giftItems = await GiftItem.findByEventId(req.params.id);
    res.json(giftItems);
  } catch (error) {
    console.error('Error fetching gift items:', error);
    res.status(500).json({ error: 'Failed to fetch gift items' });
  }
});

router.post('/events/:id/gift-items', [
  body('name').notEmpty().withMessage('Gift item name is required'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('store_urls').isArray().withMessage('Store URLs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, store_urls } = req.body;
    console.log('Creating gift item with data:', { event_id: req.params.id, name, price, store_urls });
    
    const giftItem = await GiftItem.create({
      event_id: req.params.id,
      name,
      price,
      store_urls
    });
    console.log('Gift item created with ID:', giftItem.id);

    // If event is published, notify attendees about new gift item
    const event = await Event.findById(req.params.id);
    if (event && event.status === 'published') {
      await emailService.sendNewGiftItemEmails(event, { name, price, store_urls });
    }

    const createdItem = await GiftItem.findById(giftItem.id);
    res.status(201).json(createdItem);
  } catch (error) {
    console.error('Error creating gift item:', error);
    res.status(500).json({ error: 'Failed to create gift item' });
  }
});

router.put('/gift-items/:id', [
  body('name').notEmpty().withMessage('Gift item name is required'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('store_urls').isArray().withMessage('Store URLs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, store_urls } = req.body;
    await GiftItem.update(req.params.id, { name, price, store_urls });

    const giftItem = await GiftItem.findById(req.params.id);
    res.json(giftItem);
  } catch (error) {
    console.error('Error updating gift item:', error);
    res.status(500).json({ error: 'Failed to update gift item' });
  }
});

router.delete('/gift-items/:id', async (req, res) => {
  try {
    await GiftItem.delete(req.params.id);
    res.json({ message: 'Gift item deleted successfully' });
  } catch (error) {
    console.error('Error deleting gift item:', error);
    res.status(500).json({ error: 'Failed to delete gift item' });
  }
});

module.exports = router;
