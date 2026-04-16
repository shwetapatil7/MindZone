const express = require("express");
const Journal = require("../models/Journal");
const Mood = require("../models/Mood");
const auth = require("../middleware");

const router = express.Router();

// GET Overall Analytics
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Journal count
    const totalJournals = await Journal.countDocuments({ user: userId });

    // Mood Analytics (average 1–5 scale)
    const moods = await Mood.find({ user: userId });

    let avgMood = 0;

    if (moods.length > 0) {
      // Convert emoji → number
      const moodMap = {
        "😀": 5,
        "🙂": 4,
        "😐": 3,
        "😟": 2,
        "😡": 1,
      };

      const total = moods.reduce((sum, m) => sum + (moodMap[m.emoji] || 3), 0);
      avgMood = (total / moods.length).toFixed(2);
    }

    res.json({
      totalJournals,
      avgMood,
      moodEntries: moods.length,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

module.exports = router;
