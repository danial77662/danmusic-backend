const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// 1. Initialize Express App FIRST
const app = express();

// 2. Middleware: Handle Private Network Access (PNA) for local dev calls from HTTPS origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

// 3. Middleware: Production-Grade CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Access-Control-Allow-Private-Network'],
  credentials: true
}));

// 4. Middleware: Parse JSON payloads
app.use(express.json());

// Root health check route
app.get('/', (req, res) => {
  res.status(200).send('DanMusic API Server is running successfully.');
});

const JWT_SECRET = process.env.JWT_SECRET || 'danmusic_super_secret_key_2026';

// Persistent global memory store across Vercel warm lambda invocations
globalThis.users = globalThis.users || [];
const users = globalThis.users;

// Helper function to create JWT tokens
const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      hasActiveSubscription: Boolean(user.hasActiveSubscription)
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Middleware: Enforce Active Subscription
const requireActiveSubscription = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

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

// --- API ROUTES ---

// Healthcheck Route
app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'ok', message: 'DanMusic Backend API is running.' });
});

// 1. User Registration Route
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const sanitizedEmail = String(email).trim().toLowerCase();
    const existingUser = users.find(u => u.email === sanitizedEmail);

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: String(name).trim(),
      email: sanitizedEmail,
      password: hashedPassword,
      hasActiveSubscription: false,
      subscriptionDueDate: null
    };

    users.push(newUser);
    return res.status(201).json({ message: 'User registered successfully! Please log in.' });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. User Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const sanitizedEmail = String(email).trim().toLowerCase();
    const user = users.find(u => u.email === sanitizedEmail);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = createToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// 3. Subscription Route
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

    user.hasActiveSubscription = true;
    user.subscriptionDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newToken = createToken(user);

    return res.status(200).json({
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

// 4. Protected App Data Route
app.get('/api/app-data', requireActiveSubscription, (req, res) => {
  return res.status(200).json({ status: 'ok', data: 'Protected DanMusic content accessible.' });
});

// 5. Account Info Route
app.get('/api/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    return res.status(200).json({
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

// Start server locally if run directly
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[DanMusic Server] Running on http://localhost:${PORT}`);
  });
}

// Export app for Vercel serverless integration
module.exports = app;