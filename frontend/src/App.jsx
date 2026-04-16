import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ======================= AXIOS SETUP =========================
axios.defaults.baseURL = 'http://localhost:5000/api';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------- API HELPERS -------
const api = {
  register: (username, email, password) =>
    axios.post('/auth/register', { username, email, password }),
  login: (username, password) =>
    axios.post('/auth/login', { username, password }),
  saveTypedJournal: (content) =>
    axios.post('/journals/typed', { content }),
  getJournals: () => axios.get('/journals'),
  submitMood: (emoji, note) =>
    axios.post('/moods', { emoji, note }),
  getMoodAnalytics: () => axios.get('/analytics/moods'),
  getJournalAnalytics: () => axios.get('/analytics/journals'),
};

// ======================= DRAWING HOOKS =======================
const CYCLE = [
  { text: 'Inhale', duration: 4 },
  { text: 'Hold', duration: 1 },
  { text: 'Exhale', duration: 4 },
  { text: 'Pause', duration: 1 },
];
const TOTAL_DURATION = 10;

function initCanvas(canvas, ctx, color, thickness, saveState) {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 300;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (typeof saveState === 'function') saveState(canvas);
}

const useCanvasDrawing = (mode) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [penColor, setPenColor] = useState('#657D60');
  const [penThickness, setPenThickness] = useState(5);
  const undoHistoryRef = useRef([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const saveState = useCallback((canvas) => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL();
    if (undoHistoryRef.current.length >= 20) {
      undoHistoryRef.current.shift();
    }
    undoHistoryRef.current.push(dataURL);
  }, []);

  const undoDrawing = useCallback(() => {
    if (undoHistoryRef.current.length > 1) {
      undoHistoryRef.current.pop();
      const lastState =
        undoHistoryRef.current[undoHistoryRef.current.length - 1];
      const img = new Image();
      img.onload = function () {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = lastState;
    } else if (undoHistoryRef.current.length === 1) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      undoHistoryRef.current = [];
      saveState(canvas);
    }
  }, [saveState]);

  useEffect(() => {
    if (mode === 'write' || mode === 'erase') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      ctxRef.current = canvas.getContext('2d');
      initCanvas(canvas, ctxRef.current, penColor, penThickness, saveState);

      if (undoHistoryRef.current.length > 0) {
        const lastState =
          undoHistoryRef.current[undoHistoryRef.current.length - 1];
        const img = new Image();
        img.onload = function () {
          const ctx = ctxRef.current;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = lastState;
      }
    }
  }, [mode, saveState, penColor, penThickness]);

  const startDrawing = (e) => {
    if (!ctxRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    lastPosRef.current = { x, y };
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    ctxRef.current.lineTo(x + 0.1, y + 0.1);
    ctxRef.current.stroke();
  };

  const draw = (e) => {
    if (!isDrawing || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    lastPosRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    ctxRef.current.closePath();
    saveState(canvasRef.current);
  };

  useEffect(() => {
    if (ctxRef.current) {
      if (mode === 'erase') {
        ctxRef.current.strokeStyle = '#FFFFFF';
        ctxRef.current.lineWidth = 20;
      } else {
        ctxRef.current.strokeStyle = penColor;
        ctxRef.current.lineWidth = penThickness;
      }
    }
  }, [mode, penColor, penThickness]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);
      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
      };
    }
  }, [startDrawing, draw, stopDrawing]);

  return { canvasRef, penColor, setPenColor, penThickness, setPenThickness, undoDrawing };
};

// ======================= NAV =======================
function Nav({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: 'fas fa-home' },
    { id: 'journal', label: 'Journal', icon: 'fas fa-book' },
    { id: 'mood', label: 'Mood', icon: 'fas fa-smile' },
    { id: 'exercises', label: 'Exercises', icon: 'fas fa-dumbbell' },
    { id: 'community', label: 'Community', icon: 'fas fa-users' },
  ];

  return (
    <nav id="main-nav" style={{ display: 'flex' }}>
      <div className="logo">MINDZONE</div>
      <div className="nav-links">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
            data-page={item.id}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.id);
            }}
          >
            <i className={item.icon}></i> {item.label}
          </a>
        ))}
        <a
          href="#profile"
          className={`profile-icon ${currentPage === 'profile' ? 'active' : ''}`}
          data-page="profile"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('profile');
          }}
        >
          <i className="fas fa-user"></i>
        </a>
      </div>
    </nav>
  );
}

// ======================= LOGIN / REGISTER =======================
function LoginPage({ onAuthSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.login(loginForm.username, loginForm.password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      onAuthSuccess(res.data.username);
    } catch (err) {
      console.error(err);
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await api.register(
        registerForm.username,
        registerForm.email,
        registerForm.password
      );
      alert('Registered! Please sign in.');
      setIsRegisterMode(false);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Registration failed. Try different details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="login-register" className="page full-screen-page">
      <div className="split-container">
        <div className="split-left">
          <div className="auth-logo">
            <div className="auth-logo-circle"></div> MINDZONE
          </div>
          <p className="illustration-text">mental health journal</p>
        </div>

        <div className="split-right">
          <button
            className="auth-toggle-btn"
            onClick={() => {
              setError('');
              setIsRegisterMode(!isRegisterMode);
            }}
          >
            {isRegisterMode ? 'Sign In' : 'Register'}
          </button>

          <div className="form-container">
            {error && <p style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</p>}

            {!isRegisterMode && (
              <div id="login-form">
                <h2>LOGIN HERE</h2>
                <input
                  type="text"
                  placeholder="username"
                  required
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                />
                <input
                  type="password"
                  placeholder="password"
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
                <button
                  className="primary-btn"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'sign in'}
                </button>
                <a href="#">Forgot Password?</a>
              </div>
            )}

            {isRegisterMode && (
              <div id="register-form">
                <h2>REGISTER HERE</h2>
                <input
                  type="text"
                  placeholder="username"
                  required
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, username: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="enter your email"
                  required
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                />
                <input
                  type="password"
                  placeholder="password"
                  required
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, password: e.target.value })
                  }
                />
                <button
                  className="primary-btn"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'register'}
                </button>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsRegisterMode(false);
                    setError('');
                  }}
                >
                  Already have an account? Sign in
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================= HOME =======================
function HomePage({ handleNavigation }) {
  return (
    <section id="home" className="page app-page">
      <header>
        <h1 className="home-welcome">
          Welcome back to MindZone
        </h1>
        <p className="daily-question">How are you feeling today?</p>
      </header>

      <div className="daily-inspiration card">
        "You are stronger than you think."
        <p className="sub-text">Daily Inspiration</p>
      </div>

      <div className="quick-access-grid">
        <div
          className="access-card card"
          data-page="journal"
          onClick={() => handleNavigation('journal')}
        >
          <i className="fas fa-book-open"></i>
          <p>start journaling</p>
        </div>
        <div
          className="access-card card"
          data-page="mood"
          onClick={() => handleNavigation('mood')}
        >
          <i className="fas fa-heart"></i>
          <p>Track Mood</p>
        </div>
        <div
          className="access-card card"
          data-page="exercises"
          onClick={() => handleNavigation('exercises')}
        >
          <i className="fas fa-hands-helping"></i>
          <p>Mindfulness</p>
        </div>
        <div
          className="access-card card"
          data-page="analytics"
          onClick={() => handleNavigation('analytics')}
        >
          <i className="fas fa-chart-line"></i>
          <p>View Analytics</p>
        </div>
      </div>

      <div className="mood-chart-card card">
        <h3>Your Week at a Glance</h3>
        <div className="chart-placeholder">Area Chart Visualization Placeholder</div>
        <p className="sub-text">Your average mood this week: 7.2/10</p>
      </div>
    </section>
  );
}

// ======================= BREATHING =======================
function BreathingExercise() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const getBreathingInfo = useCallback((step) => {
    let cumulativeStep = 0;
    for (let i = 0; i < CYCLE.length; i++) {
      const phase = CYCLE[i];
      const startStep = cumulativeStep;
      const endStep = cumulativeStep + phase.duration - 1;

      if (step >= startStep && step <= endStep) {
        const remainingTime = endStep - step + 1;
        return { text: phase.text, timer: remainingTime };
      }
      cumulativeStep += phase.duration;
    }
    return { text: 'Start Now', timer: '' };
  }, []);

  useEffect(() => {
    if (!isBreathing) return;
    const intervalId = setInterval(() => {
      setCurrentStep((prevStep) => (prevStep + 1) % TOTAL_DURATION);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isBreathing]);

  useEffect(() => {
    const circle = document.getElementById('breathing-circle');
    if (circle) {
      const isExpanding = isBreathing && currentStep >= 0 && currentStep <= 3;
      const isContracting = isBreathing && currentStep >= 5 && currentStep <= 8;
      if (isExpanding) {
        circle.classList.add('expand');
        circle.classList.remove('contract');
      } else if (isContracting) {
        circle.classList.add('contract');
        circle.classList.remove('expand');
      } else {
        circle.classList.remove('expand');
        circle.classList.remove('contract');
      }
    }
  }, [isBreathing, currentStep]);

  const { text, timer } = getBreathingInfo(currentStep);

  const toggleBreathing = () => {
    setIsBreathing((prev) => {
      if (!prev) setCurrentStep(0);
      return !prev;
    });
  };

  const resetBreathing = () => {
    setIsBreathing(false);
    setCurrentStep(0);
  };

  return (
    <div className="breathing-card card">
      <h3>Interactive Breathing Exercise (4-1-4-1)</h3>
      <p>Follow the animation: Inhale (expands), Exhale (contracts).</p>
      <div className="breathing-animation-container">
        <div
          id="breathing-circle"
          className={`outer-circle ${isBreathing ? 'animate' : ''}`}
        >
          <div className="inner-circle">
            <p id="breathing-text">{isBreathing ? text : 'Start Now'}</p>
            <div id="breathing-timer">{isBreathing ? timer : ''}</div>
          </div>
        </div>
      </div>
      <div className="controls">
        <button
          id="toggle-breathing"
          className="primary-btn"
          onClick={toggleBreathing}
        >
          <i className={`fas fa-${isBreathing ? 'pause' : 'play'}`}></i>{' '}
          {isBreathing ? 'Pause' : 'Start'}
        </button>
        <button className="secondary-btn" onClick={resetBreathing}>
          <i className="fas fa-sync-alt"></i> Reset
        </button>
      </div>
    </div>
  );
}

// ======================= JOURNAL (BACKEND) =======================
function JournalPage() {
  const [journalMode, setJournalMode] = useState('type');
  const [isPrivate, setIsPrivate] = useState(true);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('great');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [entries, setEntries] = useState([]);

  const {
    canvasRef,
    penColor,
    setPenColor,
    penThickness,
    setPenThickness,
    undoDrawing,
  } = useCanvasDrawing(journalMode);

  const loadJournals = async () => {
    try {
      const res = await api.getJournals();
      setEntries(res.data || []);
    } catch (err) {
      console.error('Error loading journals', err);
    }
  };

  useEffect(() => {
    loadJournals();
  }, []);

  const handleSave = async () => {
    if (!content.trim() && journalMode === 'type') {
      setMessage('Please write something before saving.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const finalContent = `Title: ${title || '(no title)'}\nMood: ${mood}\nPrivate: ${
        isPrivate ? 'yes' : 'no'
      }\n\n${content}`;
      await api.saveTypedJournal(finalContent);
      setMessage('Saved journal entry!');
      setTitle('');
      setContent('');
      loadJournals();
    } catch (err) {
      console.error(err);
      setMessage('Error saving entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="journal" className="page app-page">
      <h2>Journal</h2>
      <div className="journal-container">
        <div className="journal-editor card">
          <input
            type="text"
            placeholder="Enter title:"
            className="journal-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="journal-top-controls">
            <label className="mood-dropdown-label" htmlFor="mood-select">
              How are you feeling...?
            </label>
            <select
              id="mood-select"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="great">😀 Great</option>
              <option value="good">🙂 Good</option>
              <option value="okay">😐 Okay</option>
              <option value="sad">😟 Sad</option>
              <option value="angry">😡 Angry</option>
            </select>
          </div>

          <div className="privacy-toggle">
            <button
              className={isPrivate ? 'active' : ''}
              onClick={() => setIsPrivate(true)}
            >
              Private <i className="fas fa-lock"></i>
            </button>
            <button
              className={!isPrivate ? 'active' : ''}
              onClick={() => setIsPrivate(false)}
            >
              Public (Anonymous) <i className="fas fa-users"></i>
            </button>
          </div>

          <div className="mode-tabs">
            <button
              className={`mode-tab ${journalMode === 'type' ? 'active' : ''}`}
              data-mode="type"
              onClick={() => setJournalMode('type')}
            >
              Type Mode
            </button>
            <button
              className={`mode-tab ${
                journalMode === 'write' || journalMode === 'erase' ? 'active' : ''
              }`}
              data-mode="write"
              onClick={() => setJournalMode('write')}
            >
              Draw Mode
            </button>
          </div>

          <div
            id="type-mode"
            className={`journal-mode ${journalMode === 'type' ? 'active' : ''}`}
          >
            <textarea
              placeholder="start your journaling here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>

          <div
            id="write-mode"
            className={`journal-mode ${
              journalMode === 'write' || journalMode === 'erase' ? 'active' : ''
            }`}
          >
            <div className="draw-tools">
              <label htmlFor="color-picker">Pen Color:</label>
              <input
                type="color"
                id="color-picker"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
              />

              <label htmlFor="thickness">Thickness:</label>
              <input
                type="range"
                id="thickness"
                min="1"
                max="20"
                value={penThickness}
                onChange={(e) => setPenThickness(Number(e.target.value))}
              />

              <button
                className={`secondary-btn ${
                  journalMode === 'write' ? 'active' : ''
                }`}
                onClick={() => setJournalMode('write')}
              >
                <i className="fas fa-pen"></i> Pen
              </button>
              <button
                className={`secondary-btn ${
                  journalMode === 'erase' ? 'active' : ''
                }`}
                onClick={() => setJournalMode('erase')}
              >
                <i className="fas fa-eraser"></i> Eraser
              </button>
              <button className="secondary-btn" onClick={undoDrawing}>
                <i className="fas fa-undo"></i> Undo
              </button>
            </div>
            <canvas ref={canvasRef} id="handwriting-canvas"></canvas>
            <div className="draw-mode-tip">
              Current Mode:{' '}
              <strong>
                {journalMode === 'erase'
                  ? 'Eraser (White)'
                  : journalMode === 'write'
                  ? 'Pen'
                  : ''}
              </strong>
            </div>
          </div>

          {message && (
            <p style={{ marginTop: '0.5rem', color: message.includes('Error') ? 'red' : 'green' }}>
              {message}
            </p>
          )}

          <div className="journal-actions">
            <button
              className="primary-btn"
              onClick={handleSave}
              disabled={saving}
            >
              <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button className="secondary-btn">
              <i className="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>

        <div className="past-entries-sidebar card">
          <h3>Past Entries</h3>
          {entries.length === 0 && <p>No entries yet.</p>}
          {entries.map((entry) => (
            <div key={entry._id} className="entry-item">
              <span>
                {entry.date
                  ? new Date(entry.date).toLocaleDateString()
                  : ''}
              </span>
              <strong>{entry.type === 'typed' ? 'Typed Entry' : 'Handwritten'}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================= MOOD =======================
function MoodTrackerPage() {
  const [selectedMood, setSelectedMood] = useState('Great');
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  const moodOptions = [
    { label: 'Great', icon: '😀' },
    { label: 'Good', icon: '🙂' },
    { label: 'Okay', icon: '😐' },
    { label: 'Sad', icon: '😟' },
    { label: 'Angry', icon: '😡' },
  ];

  const periodOptions = ['Week', 'Month', 'Year'];

  const handleSubmitMood = async () => {
    const selected = moodOptions.find((m) => m.label === selectedMood);
    const emoji = selected?.icon || '😐';
    setMessage('');
    try {
      await api.submitMood(emoji, note);
      setMessage('Mood saved!');
      setNote('');
    } catch (err) {
      console.error(err);
      setMessage('Failed to save mood.');
    }
  };

  return (
    <section id="mood" className="page app-page">
      <h2>Mood Tracker</h2>
      <div className="mood-tracker-grid">
        <div className="mood-input-card card">
          <h3>How are you feeling today?</h3>
          <div className="mood-selector">
            {moodOptions.map((mood) => (
              <button
                key={mood.label}
                className={`mood-option ${
                  selectedMood === mood.label ? 'selected' : ''
                }`}
                onClick={() => setSelectedMood(mood.label)}
              >
                <span>{mood.icon}</span> {mood.label}
              </button>
            ))}
          </div>
          <label htmlFor="note-input">Add Note (optional)</label>
          <textarea
            id="note-input"
            placeholder="What's making you feel this way?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          ></textarea>
          {message && (
            <p style={{ marginTop: '0.5rem', color: message.includes('Failed') ? 'red' : 'green' }}>
              {message}
            </p>
          )}
          <button className="submit-btn primary-btn" onClick={handleSubmitMood}>
            Submit Mood
          </button>
        </div>

        <div className="mood-stats-grid">
          <div className="stat-card">
            <i className="fas fa-chart-line"></i>
            <p>Average Mood</p>
            <strong>4.3/5.0</strong>
          </div>
          <div className="stat-card">
            <i className="fas fa-calendar-check"></i>
            <p>Tracking Streak</p>
            <strong>7 days</strong>
          </div>
          <div className="stat-card">
            <i className="fas fa-grin-hearts"></i>
            <p>Best Mood</p>
            <strong>5 times</strong>
          </div>
        </div>

        <div className="mood-chart-wrapper">
          <h3>Mood Trends</h3>
          <div className="chart-period-toggle">
            {periodOptions.map((period) => (
              <button
                key={period}
                className={selectedPeriod === period ? 'active' : ''}
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
          <div className="chart-placeholder">Line Chart Visualization Placeholder</div>
        </div>

        <div className="mood-distribution-chart card">
          <h3>Mood Distribution</h3>
          <div className="chart-placeholder">Pie Chart Visualization Placeholder</div>
        </div>
      </div>
    </section>
  );
}

// ======================= EXERCISES =======================
function ExercisesPage() {
  return (
    <section id="exercises" className="page app-page">
      <h2>Mindfulness & Exercises</h2>

      <div className="exercises-header-tabs">
        <button className="active">Breathing</button>
        
      </div>

      <BreathingExercise />
    </section>
  );
}

// ======================= COMMUNITY =======================
function CommunityPage() {
  return (
    <section id="community" className="page app-page">
      <h2>Community</h2>

      <div className="community-info-card card">
        <h3>Share & Connect</h3>
        <p>
          Anonymously read and share stories with others on a similar journey.
          Remember to be kind.
        </p>
      </div>

      <div className="share-story-card card">
        <h3>Share Your Story (Anonymous)</h3>
        <textarea placeholder="Write your thoughts here..."></textarea>
        <button className="primary-btn">
          <i className="fas fa-paper-plane"></i> Post Anonymously
        </button>
      </div>

      <div className="anonymous-posts">
        <h3>Recent Anonymous Posts</h3>
        <div className="post-card card">
          <p>
            "It's been a tough week, but I'm proud I kept my journal streak
            going."
          </p>
          <span className="post-date">1 hour ago</span>
        </div>
        <div className="post-card card">
          <p>
            "Tried the 4-1-4-1 breathing exercise, it really helped me calm down
            before a presentation."
          </p>
          <span className="post-date">3 hours ago</span>
        </div>
      </div>
    </section>
  );
}

// ======================= PROFILE =======================
function ProfilePage({ onLogout }) {
  return (
    <section id="profile" className="page app-page">
      <h2>Profile Settings</h2>
      <div className="profile-grid">
        <div className="profile-details-card card">
          <h3>User Information</h3>
          <p>
            <strong>Username:</strong> MindfulUser42
          </p>
          <p>
            <strong>Email:</strong> user@example.com
          </p>
          <p>
            <strong>Member Since:</strong> June 2025
          </p>
          <button className="secondary-btn">
            <i className="fas fa-edit"></i> Edit Profile
          </button>
        </div>

        <div className="profile-stats-card card">
          <h3>Summary</h3>
          <p>
            <strong>Current Streak:</strong> 7 Days
          </p>
          <p>
            <strong>Total Journal Entries:</strong> 15
          </p>
          <p>
            <strong>Mood Entries:</strong> 22
          </p>
          <p>
            <strong>Longest Streak:</strong> 7 days
          </p>
        </div>

        <div className="profile-actions-card card">
          <h3>Account Actions</h3>
          <button className="secondary-btn">
            <i className="fas fa-key"></i> Change Password
          </button>
          <button className="secondary-btn">
            <i className="fas fa-bell"></i> Notification Settings
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('username');
              if (onLogout) onLogout();
            }}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    </section>
  );
}

// ======================= ANALYTICS  =======================
function AnalyticsPage() {
  const [moodStats, setMoodStats] = useState(null);
  const [journalStats, setJournalStats] = useState(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [moodsRes, journalsRes] = await Promise.all([
          api.getMoodAnalytics(),
          api.getJournalAnalytics(),
        ]);
        setMoodStats(moodsRes.data || {});
        setJournalStats(journalsRes.data || {});
      } catch (err) {
        console.error('Error loading analytics', err);
      }
    };
    loadAnalytics();
  }, []);

  let mostCommonMood = null;
  if (moodStats) {
    const entries = Object.entries(moodStats);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      mostCommonMood = entries[0];
    }
  }

  return (
    <section id="analytics" className="page app-page">
      <h2>Analytics Dashboard</h2>
      <div className="analytics-summary-grid">
        <div className="summary-card card">
          <h3>Happiest Mood</h3>
          <p>Most logged mood:</p>
          <p style={{ fontSize: '2em' }}>
            {mostCommonMood ? `${mostCommonMood[0]} (${mostCommonMood[1]}x)` : '—'}
          </p>
        </div>
        <div className="summary-card card">
          <h3>Consistency Streak</h3>
          <p>Currently:</p>
          <p
            style={{
              fontSize: '2em',
              fontWeight: 700,
              color: 'var(--color-soft-green)',
            }}
          >
            {/* We don't have real streak yet, keep placeholder */}
            7 Days
          </p>
        </div>
        <div className="summary-card card">
          <h3>Total Journals</h3>
          <p>Journal entries saved:</p>
          <p
            style={{
              fontSize: '2em',
              fontWeight: 700,
              color: 'var(--color-dark-green)',
            }}
          >
            {journalStats?.totalJournals ?? 0}
          </p>
        </div>
      </div>

      <div className="analytics-chart-wrapper card">
        <h3>Mood Over Time</h3>
        <div className="chart-placeholder">Detailed Monthly/Yearly Chart Visualization Placeholder</div>
      </div>
    </section>
  );
}

// ======================= MAIN APP =======================
function App() {
  const [currentPage, setCurrentPage] = useState('login-register');
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('token')
  );

  const handleNavigation = useCallback((pageId) => {
    setCurrentPage(pageId);
  }, []);

  const handleAuthSuccess = useCallback(
    (_username) => {
      setIsAuthenticated(true);
      handleNavigation('home');
    },
    [handleNavigation]
  );

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('login-register');
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      return <LoginPage onAuthSuccess={handleAuthSuccess} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage handleNavigation={handleNavigation} />;
      case 'journal':
        return <JournalPage />;
      case 'mood':
        return <MoodTrackerPage />;
      case 'exercises':
        return <ExercisesPage />;
      case 'community':
        return <CommunityPage />;
      case 'profile':
        return <ProfilePage onLogout={handleLogout} />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <HomePage handleNavigation={handleNavigation} />;
    }
  };

  return (
    <div className="app-container">
      {isAuthenticated && (
        <Nav currentPage={currentPage} onNavigate={handleNavigation} />
      )}
      {renderPage()}
    </div>
  );
}

export default App;
