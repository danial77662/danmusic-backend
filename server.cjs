const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'https://danmusic.online',
    'https://www.danmusic.online',
    'http://localhost:5173'
  ]
}));

const JWT_SECRET = 'danmusic_super_secret_key_2026';

// In-memory database (Replace with MongoDB / PostgreSQL in production)
const users = [];

// Helper function to create JWTs with active subscription state
const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      hasActiveSubscription: user.hasActiveSubscription
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// MIDDLEWARE: Enforce active subscription
const requireActiveSubscription = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Always check the current status from the store
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (!user.hasActiveSubscription) {
      return res.status(403).json({ error: 'Subscription required. Please pay 299 PKR to access DanMusic.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};

// 1. User Registration Route
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      hasActiveSubscription: false,
      subscriptionDueDate: null
    };

    users.push(newUser);
    return res.status(201).json({ message: 'User registered successfully! Please log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. User Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// 3. Payment / Subscription Renewal Route
app.post('/api/subscribe', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Activate 30-day membership
    user.hasActiveSubscription = true;
    user.subscriptionDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newToken = createToken(user);

    return res.json({
      message: 'Subscription of 299 PKR verified successfully!',
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasActiveSubscription: true
      }
    });
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
});

// 4. Protected Route Example
app.get('/api/app-data', requireActiveSubscription, (req, res) => {
  return res.json({ status: 'ok', data: 'Protected DanMusic content accessible.' });
});

// 5. Current Account Route (auth required, subscription NOT required)
// Used on app load to restore the session and know premium status,
// without blocking free users from the app itself.
app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
});

app.use(require('cors')({ origin: '*' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`[DanMusic Server] Running on http://localhost:${PORT}`);
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`[DanMusic Server] Running on http://localhost:${PORT}`);
});
