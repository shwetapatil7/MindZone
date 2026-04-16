const express = require('express');
const Reflection = require('../models/Reflection');
const auth = require('../middleware/auth');

const router = express.Router();

// Add Reflection
router.post('/', auth, async (req, res) => {
  const { content, anonymous = true } = req.body;
  try {
    const reflection = new Reflection({ user: anonymous ? null : req.user._id, content, anonymous });
    await reflection.save();
    res.status(201).json(reflection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get All Reflections
router.get('/', async (req, res) => {
  try {
    const reflections = await Reflection.find().populate('user', 'username').sort({ date: -1 });
    res.json(reflections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;