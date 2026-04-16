const express = require("express");
const multer = require("multer");
const path = require("path");
const Journal = require("../models/Journal");
const auth = require("../middleware");

const router = express.Router();

// upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Typed journal
router.post("/typed", auth, async (req, res) => {
  try {
    const journal = new Journal({
      user: req.user._id,
      type: "typed",
      content: req.body.content,
    });

    await journal.save();
    res.status(201).json(journal);
  } catch (err) {
    console.error("JOURNAL SAVE ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Handwritten with image
router.post("/handwritten", auth, upload.single("image"), async (req, res) => {
  try {
    const journal = new Journal({
      user: req.user._id,
      type: "handwritten",
      imageUrl: req.file.path,
    });

    await journal.save();
    res.status(201).json(journal);
  } catch (err) {
    console.error("HANDWRITE SAVE ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all
router.get("/", auth, async (req, res) => {
  try {
    const journals = await Journal.find({ user: req.user._id }).sort({
      date: -1,
    });
    res.json(journals);
  } catch (err) {
    console.error("GET JOURNALS ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
