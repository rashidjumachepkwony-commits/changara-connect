const express = require('express');
const Contact = require('../models/Contact');
const router = express.Router();

const isObjectId = (v) => require('mongoose').Types.ObjectId.isValid(v);

/**
 * POST /api/contact - submit a general inquiry
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your name.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a message.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    await Contact.create({
      name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : '',
      phone: phone ? String(phone).trim() : '',
      subject: subject ? String(subject).trim() : '',
      message: String(message).trim().slice(0, 2000)
    });

    res.status(201).json({ success: true, message: 'Thank you for your message. We will get back to you soon.' });
  } catch (err) {
    console.error('[contact]', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
