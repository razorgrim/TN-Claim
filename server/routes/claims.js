import express from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to format claim response (parsing JSON fields)
const formatClaim = (claim) => {
  return {
    ...claim,
    totals: JSON.parse(claim.totals),
    items: JSON.parse(claim.items),
    is_archived: !!claim.is_archived
  };
};

// 1. GET ALL CLAIMS (Admin: all claims, Staff: own claims)
router.get('/', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    let query, params;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT c.*, u.name as employeeName, u.ic, u.contact, u.department 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        ORDER BY c.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT c.*, u.name as employeeName, u.ic, u.contact, u.department 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.user_id = ? 
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    }

    const [rows] = await db.query(query, params);
    const formatted = rows.map(formatClaim);
    return res.json(formatted);
  } catch (err) {
    console.error('Error fetching claims:', err);
    return res.status(500).json({ error: 'Server error fetching claims.' });
  }
});

// 2. GET SINGLE CLAIM BY ID
router.get('/:id', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.name as employeeName, u.ic, u.contact, u.department 
      FROM claims c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const claim = rows[0];

    // Access control: non-admins can only see their own claims
    if (req.user.role !== 'admin' && claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own claims.' });
    }

    return res.json(formatClaim(claim));
  } catch (err) {
    console.error('Error fetching claim details:', err);
    return res.status(500).json({ error: 'Server error fetching claim details.' });
  }
});

// 3. CREATE NEW CLAIM / DRAFT
router.post('/', requireAuth, async (req, res) => {
  const { type, items, totals, status } = req.body; // status is 'Draft' or 'Pending'
  const db = getDb();

  if (!type || !items || !totals) {
    return res.status(400).json({ error: 'Missing claim details.' });
  }

  try {
    const isDraft = status === 'Draft';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const claimId = `${isDraft ? 'DFT' : 'CLM'}-${randNum}`;

    const dateStr = new Date().toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    await db.query(`
      INSERT INTO claims (id, user_id, type, date, month, status, admin_comments, totals, items)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      claimId,
      req.user.id,
      type,
      dateStr,
      monthStr,
      isDraft ? 'Draft' : 'Pending',
      '',
      JSON.stringify(totals),
      JSON.stringify(items)
    ]);

    return res.status(201).json({ id: claimId, message: 'Claim successfully created.' });
  } catch (err) {
    console.error('Error creating claim:', err);
    return res.status(500).json({ error: 'Server error creating claim.' });
  }
});

// 4. UPDATE DRAFT CLAIM (Edit draft or Submit it)
router.put('/:id', requireAuth, async (req, res) => {
  const { items, totals, status } = req.body; // status is 'Draft' or 'Pending'
  const db = getDb();

  try {
    // Check if claim exists, belongs to user, and is a draft
    const [existing] = await db.query('SELECT user_id, status FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const claim = existing[0];
    if (claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only modify your own claims.' });
    }

    if (claim.status !== 'Draft' && claim.status !== 'Pending' && claim.status !== 'Rejected') {
      return res.status(400).json({ error: 'Only draft, pending, or rejected claims can be edited.' });
    }

    let newId = req.params.id;
    const finalStatus = status; // 'Draft' or 'Pending'
    if (finalStatus === 'Pending' && newId.startsWith('DFT-')) {
      newId = newId.replace('DFT-', 'CLM-');
    } else if (finalStatus === 'Draft' && newId.startsWith('CLM-')) {
      newId = newId.replace('CLM-', 'DFT-');
    }

    await db.query(`
      UPDATE claims 
      SET id = ?, status = ?, totals = ?, items = ?, date = ?
      WHERE id = ?
    `, [
      newId,
      finalStatus,
      JSON.stringify(totals),
      JSON.stringify(items),
      new Date().toISOString().split('T')[0],
      req.params.id
    ]);

    return res.json({ id: newId, message: 'Claim updated successfully.' });
  } catch (err) {
    console.error('Error updating claim:', err);
    return res.status(500).json({ error: 'Server error updating claim.' });
  }
});

// 5. ADMIN REVIEW ENDPOINT (Approve / Reject)
router.put('/:id/review', requireAdmin, async (req, res) => {
  const { status, adminComments, items, totals } = req.body; // status: Approved | Rejected
  const db = getDb();

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid claim status choice.' });
  }

  try {
    const [existing] = await db.query('SELECT status FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    if (existing[0].status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending claims can be reviewed.' });
    }

    let query = `
      UPDATE claims 
      SET status = ?, admin_comments = ?
    `;
    const params = [status, adminComments || ''];

    if (items) {
      query += `, items = ?`;
      params.push(JSON.stringify(items));
    }
    if (totals) {
      query += `, totals = ?`;
      params.push(JSON.stringify(totals));
    }

    query += ` WHERE id = ?`;
    params.push(req.params.id);

    await db.query(query, params);

    return res.json({ message: `Claim successfully ${status.toLowerCase()}.` });
  } catch (err) {
    console.error('Error reviewing claim:', err);
    return res.status(500).json({ error: 'Server error reviewing claim.' });
  }
});

// 6. ADMIN CORRECTIONS ENDPOINT (Edit & save / Edit & approve)
router.put('/:id/admin-edit', requireAdmin, async (req, res) => {
  const { items, totals, status } = req.body; // status: Pending | Approved
  const db = getDb();

  try {
    const [existing] = await db.query('SELECT status FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    if (existing[0].status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending claims can be modified by admin.' });
    }

    const finalComments = status === 'Approved' 
      ? 'Approved after admin modifications.' 
      : 'Modified by admin. Pending final review.';

    await db.query(`
      UPDATE claims 
      SET items = ?, totals = ?, status = ?, admin_comments = ?
      WHERE id = ?
    `, [
      JSON.stringify(items),
      JSON.stringify(totals),
      status,
      finalComments,
      req.params.id
    ]);

    return res.json({ message: 'Claim details corrected successfully.' });
  } catch (err) {
    console.error('Error applying admin edits:', err);
    return res.status(500).json({ error: 'Server error saving modifications.' });
  }
});

// 7. DELETE CLAIM (Staff can delete their own Draft/Pending/Rejected claims, Admins can delete any claim)
router.delete('/:id', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const [existing] = await db.query('SELECT user_id, status FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const claim = existing[0];
    // Access control: non-admins can only delete their own claims
    if (req.user.role !== 'admin') {
      if (claim.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only delete your own claims.' });
      }
      // Staff can only delete Draft, Pending, or Rejected claims
      if (claim.status !== 'Draft' && claim.status !== 'Pending' && claim.status !== 'Rejected') {
        return res.status(400).json({ error: 'Only draft, pending, or rejected claims can be deleted.' });
      }
    }

    await db.query('DELETE FROM claims WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Claim successfully deleted.' });
  } catch (err) {
    console.error('Error deleting claim:', err);
    return res.status(500).json({ error: 'Server error deleting claim.' });
  }
});

// 8. ARCHIVE CLAIM (Staff can archive/unarchive their own Approved claims)
router.put('/:id/archive', requireAuth, async (req, res) => {
  const { is_archived } = req.body;
  const db = getDb();
  
  try {
    const [existing] = await db.query('SELECT user_id, status FROM claims WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const claim = existing[0];
    
    // Access control: non-admins can only archive their own claims
    if (req.user.role !== 'admin' && claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only archive your own claims.' });
    }
    
    // Only Approved claims can be archived
    if (claim.status !== 'Approved') {
      return res.status(400).json({ error: 'Only approved claims can be archived.' });
    }

    await db.query('UPDATE claims SET is_archived = ? WHERE id = ?', [is_archived ? 1 : 0, req.params.id]);
    return res.json({ message: `Claim successfully ${is_archived ? 'archived' : 'unarchived'}.` });
  } catch (err) {
    console.error('Error archiving claim:', err);
    return res.status(500).json({ error: 'Server error archiving claim.' });
  }
});

export default router;
