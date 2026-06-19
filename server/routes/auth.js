import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Input Validation Schemas

const adminRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(50).alphanum().required().messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.empty': 'Username is required'
  }),
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
  }),
  role: Joi.string().valid('staff', 'admin').required().messages({
    'any.only': 'Please select a valid role'
  }),
  company: Joi.string().valid('Total Neutron Solution Sdn Bhd', 'Siqma Group (M) Sdn Bhd').required().messages({
    'any.only': 'Please select a valid company'
  })
});

const adminUpdateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).alphanum().required(),
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional().allow(''),
  ic: Joi.string().min(8).max(20).required(),
  contact: Joi.string().required(),
  department: Joi.string().valid(
    'Technical Operations', 
    'IT Department', 
    'Sales & Marketing', 
    'Finance & HR', 
    'Management'
  ).required(),
  role: Joi.string().valid('staff', 'admin').required(),
  company: Joi.string().valid('Total Neutron Solution Sdn Bhd', 'Siqma Group (M) Sdn Bhd').required()
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

// 1. ADMIN USER MANAGEMENT ROUTES

// List all users
router.get('/users', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const [rows] = await db.query('SELECT id, username, name, email, role, ic, contact, department, mileage_rate, company FROM users ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error('Error listing users:', err);
    return res.status(500).json({ error: 'Server error listing users.' });
  }
});

// Admin creates/registers a user
router.post('/users', requireAdmin, async (req, res) => {
  const { error, value } = adminRegisterSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, name, email, password, ic, contact, department, role, company } = value;
  const db = getDb();

  try {
    const [existingUsername] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'This username is already taken.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(`
      INSERT INTO users (username, name, email, password_hash, ic, contact, department, role, mileage_rate, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.60, ?)
    `, [username, name, email, passwordHash, ic, contact, department, role, company]);

    return res.status(201).json({ message: 'User account created successfully.' });
  } catch (err) {
    console.error('Admin user creation error:', err);
    return res.status(500).json({ error: 'Server error creating user account.' });
  }
});

// Admin updates a user profile/account
router.put('/users/:id', requireAdmin, async (req, res) => {
  const { error, value } = adminUpdateUserSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, name, email, password, ic, contact, department, role, company } = value;
  const userId = req.params.id;
  const db = getDb();

  try {
    const [existingUsername] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'This username is already taken by another account.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another account is already using this email address.' });
    }

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(`
        UPDATE users 
        SET username = ?, name = ?, email = ?, password_hash = ?, ic = ?, contact = ?, department = ?, role = ?, company = ?
        WHERE id = ?
      `, [username, name, email, passwordHash, ic, contact, department, role, company, userId]);
    } else {
      await db.query(`
        UPDATE users 
        SET username = ?, name = ?, email = ?, ic = ?, contact = ?, department = ?, role = ?, company = ?
        WHERE id = ?
      `, [username, name, email, ic, contact, department, role, company, userId]);
    }

    return res.json({ message: 'User account updated successfully.' });
  } catch (err) {
    console.error('Admin user update error:', err);
    return res.status(500).json({ error: 'Server error updating user account.' });
  }
});

// Admin deletes a user account (cannot self-delete)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const db = getDb();

  if (parseInt(userId, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.json({ message: 'User account deleted successfully.' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    return res.status(500).json({ error: 'Server error deleting user account.' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, password } = value;
  const db = getDb();

  try {
    // Fetch user
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.warn(`[Login Auth] Failed: No user found with username "${username}"`);
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.warn(`[Login Auth] Failed: Password mismatch for username "${username}". Input password length: ${password.length}. Stored hash: "${user.password_hash}"`);
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, company: user.company },
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
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        ic: user.ic,
        contact: user.contact,
        department: user.department,
        mileageRate: parseFloat(user.mileage_rate),
        company: user.company
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
    const [users] = await db.query('SELECT id, username, name, email, role, ic, contact, department, mileage_rate, company FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        ic: user.ic,
        contact: user.contact,
        department: user.department,
        mileageRate: parseFloat(user.mileage_rate),
        company: user.company
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
    department: Joi.string().required(),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required'
    }),
    password: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional().allow('')
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, ic, contact, email, password } = value;
  const db = getDb();

  try {
    // Check if email already exists for another user
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use by another account.' });
    }

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(`
        UPDATE users 
        SET name = ?, ic = ?, contact = ?, email = ?, password_hash = ?
        WHERE id = ?
      `, [name, ic, contact, email, passwordHash, req.user.id]);
    } else {
      await db.query(`
        UPDATE users 
        SET name = ?, ic = ?, contact = ?, email = ?
        WHERE id = ?
      `, [name, ic, contact, email, req.user.id]);
    }

    return res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

export default router;
