const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./database');


dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));


app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/moods', require('./routes/moods'));
app.use('/api/journals', require('./routes/journals'));

app.use('/api/analytics', require('./routes/analytics'));


// Mindfulness Exercises
app.get('/api/mindfulness', (req, res) => {
  res.json([
    { id: 1, title: 'Deep Breathing', description: 'Inhale for 4 seconds, hold for 4, exhale for 4.' },
    { id: 2, title: 'Gratitude Journal', description: 'Write 3 things you\'re grateful for.' },
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack);
  res.status(500).json({ error: err.message });
});
