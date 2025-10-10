const express = require('express');
const { authenticateAttendee } = require('../middleware/auth');
const Attendee = require('../models/Attendee');
const GiftItem = require('../models/GiftItem');
const Event = require('../models/Event');

const router = express.Router();

// Get event details for attendee
router.get('/event/:token', authenticateAttendee, async (req, res) => {
  try {
    const attendee = await Attendee.getAttendeeWithEvent(req.attendee.unique_token);
    
    if (!attendee) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get gift items for this event
    const giftItems = await GiftItem.findByEventId(attendee.event_id);
    
    // Get attendee's selected items
    const selectedItems = await GiftItem.getSelectedByAttendee(attendee.id, attendee.event_id);

    res.json({
      event: {
        id: attendee.event_id,
        subject: attendee.subject,
        description: attendee.description,
        gift_receiver_name: attendee.gift_receiver_name,
        status: attendee.status
      },
      attendee: {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email
      },
      gift_items: giftItems,
      selected_items: selectedItems
    });
  } catch (error) {
    console.error('Error fetching event for attendee:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// Select a gift item
router.post('/select/:token', authenticateAttendee, async (req, res) => {
  try {
    const { gift_item_id } = req.body;
    
    if (!gift_item_id) {
      return res.status(400).json({ error: 'Gift item ID is required' });
    }

    // Check if event is still open
    const event = await Event.findById(req.attendee.event_id);
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'This event is closed' });
    }

    // Check if gift item is already selected
    const isSelected = await GiftItem.isSelected(gift_item_id);
    if (isSelected) {
      return res.status(400).json({ error: 'This gift item is already selected by someone else' });
    }

    // Select the gift item
    const result = await GiftItem.select(gift_item_id, req.attendee.id);
    
    if (result.changes === 0) {
      return res.status(400).json({ error: 'Failed to select gift item' });
    }

    // Get updated gift items
    const giftItems = await GiftItem.findByEventId(req.attendee.event_id);
    const selectedItems = await GiftItem.getSelectedByAttendee(req.attendee.id, req.attendee.event_id);

    res.json({
      message: 'Gift item selected successfully',
      gift_items: giftItems,
      selected_items: selectedItems
    });
  } catch (error) {
    console.error('Error selecting gift item:', error);
    res.status(500).json({ error: 'Failed to select gift item' });
  }
});

// Unselect a gift item
router.post('/unselect/:token', authenticateAttendee, async (req, res) => {
  try {
    const { gift_item_id } = req.body;
    
    if (!gift_item_id) {
      return res.status(400).json({ error: 'Gift item ID is required' });
    }

    // Check if event is still open
    const event = await Event.findById(req.attendee.event_id);
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'This event is closed' });
    }

    // Check if the attendee actually selected this item
    const giftItem = await GiftItem.findById(gift_item_id);
    if (!giftItem || giftItem.selected_by_attendee_id !== req.attendee.id) {
      return res.status(400).json({ error: 'You can only unselect items you have selected' });
    }

    // Unselect the gift item
    await GiftItem.unselect(gift_item_id);

    // Get updated gift items
    const giftItems = await GiftItem.findByEventId(req.attendee.event_id);
    const selectedItems = await GiftItem.getSelectedByAttendee(req.attendee.id, req.attendee.event_id);

    res.json({
      message: 'Gift item unselected successfully',
      gift_items: giftItems,
      selected_items: selectedItems
    });
  } catch (error) {
    console.error('Error unselecting gift item:', error);
    res.status(500).json({ error: 'Failed to unselect gift item' });
  }
});

// Get attendee's selected items
router.get('/selected/:token', authenticateAttendee, async (req, res) => {
  try {
    const selectedItems = await GiftItem.getSelectedByAttendee(req.attendee.id, req.attendee.event_id);
    res.json(selectedItems);
  } catch (error) {
    console.error('Error fetching selected items:', error);
    res.status(500).json({ error: 'Failed to fetch selected items' });
  }
});

module.exports = router;

