const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const auth = require('../middleware');

// ✅ Log route hit for debugging
router.use((req, res, next) => {
  console.log("HIT /api/moods", req.method);
  next();
});

// ------------------------------------------------------
// POST — Create Mood
// ------------------------------------------------------
router.post('/', auth, async (req, res) => {
  console.log("MOOD BODY:", req.body);

  const { emoji, note } = req.body;

  if (!emoji) {
    return res.status(400).json({ message: "Mood (emoji) is required" });
  }

  try {
    const mood = new Mood({
      user: req.user._id,
      mood: emoji,
      note: note || ""
    });

    await mood.save();
    res.status(201).json({ message: "Mood saved", mood });
  } catch (err) {
    console.error("Mood save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ------------------------------------------------------
// GET — Fetch User Mood History
// ------------------------------------------------------
router.get('/', auth, async (req, res) => {

  console.log("GET MOODS → USER:", req.user);

  try {
    const moods = await Mood.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(moods);

  } catch (error) {
    console.error("MOOD GET ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
