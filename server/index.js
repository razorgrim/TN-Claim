import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import claimsRoutes from './routes/claims.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // trust first proxy
const PORT = process.env.PORT || 5000;

// 1. ADVANCED SECURITY HEADERS (Helmet with custom CSP for PDF/image frames)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:"],
      "frame-src": ["'self'", "data:", "blob:"],
      "object-src": ["'self'"],
    },
  },
}));

// Serve static uploads
app.use('/uploads', express.static(path.resolve('uploads')));

// 2. CORS CONFIGURATION
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true, // Allow cookies to be sent back and forth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. PARSERS
app.use(express.json({ limit: '100mb' })); // support base64 images upload
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// 4. RATE LIMITING (Brute-force protection)
// Global rate limiter (100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' }
});
app.use(globalLimiter);

// Authentication rate limiter (10 attempts per 10 minutes)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again after 10 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 5. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);

// 6. HEALTH CHECK
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date() });
});

// 7. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ error: 'Internal Server Error. Please contact support.' });
});

// 8. DATABASE INITIALIZATION & STARTUP
async function startServer() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    console.log('Database successfully initialized.');
    
    app.listen(PORT, () => {
      console.log(`Secure Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to database error:', error);
    process.exit(1);
  }
}

startServer();
