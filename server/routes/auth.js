import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Input Validation Schemas
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Name must be at least 3 characters long',
    'string.empty': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
    'string.empty': 'Password is required'
  }),
  ic: Joi.string().min(8).max(20).required().messages({
    'string.empty': 'IC Number is required'
  }),
  contact: Joi.string().required().messages({
    'string.empty': 'Contact number is required'
  }),
  department: Joi.string().valid(
    'Technical Operations', 
    'IT Department', 
    'Sales & Marketing', 
    'Finance & HR', 
    'Management'
  ).required().messages({
    'any.only': 'Please select a valid department'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// 1. REGISTER STAFF MEMBER
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password, ic, contact, department } = value;
  const db = getDb();

  try {
    // Check if user already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    await db.query(`
      INSERT INTO users (name, email, password_hash, ic, contact, department, role, mileage_rate)
      VALUES (?, ?, ?, ?, ?, ?, 'staff', 0.60)
    `, [name, email, passwordHash, ic, contact, department]);

    return res.status(201).json({ message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error. Failed to complete registration.' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { email, password } = value;
  const db = getDb();

  try {
    // Fetch user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey123!@#',
      { expiresIn: '8h' }
    );

    // Set cookie options
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to false to support plain HTTP Proxmox/intranet deployments
      sameSite: 'lax', // Changed to 'lax' for improved cookie sharing compatibility on local networks
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    // Return user details (omit password hash)
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ic: user.ic,
        contact: user.contact,
        department: user.department,
        mileageRate: parseFloat(user.mileage_rate)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// 3. LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
});

// 4. CHECK SESSION / GET PROFILE
router.get('/me', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const [users] = await db.query('SELECT id, name, email, role, ic, contact, department, mileage_rate FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ic: user.ic,
        contact: user.contact,
        department: user.department,
        mileageRate: parseFloat(user.mileage_rate)
      }
    });
  } catch (err) {
    console.error('Session validation error:', err);
    return res.status(500).json({ error: 'Server error during session check.' });
  }
});

// 5. UPDATE PROFILE SETTINGS
router.put('/profile', requireAuth, async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    ic: Joi.string().required(),
    contact: Joi.string().required(),
    department: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, ic, contact, department } = value;
  const db = getDb();

  try {
    await db.query(`
      UPDATE users 
      SET name = ?, ic = ?, contact = ?, department = ?
      WHERE id = ?
    `, [name, ic, contact, department, req.user.id]);

    return res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

export default router;
