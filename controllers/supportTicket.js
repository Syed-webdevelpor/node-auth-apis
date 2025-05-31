const DB = require("../dbConnection.js");
const { sendSupportTicketEmail } = require('../middlewares/sesMail.js');

// Create ticket
exports.createTicket = async (req, res) => {
  const { user_id, subject, message, category, priority } = req.body;

  try {
    // Get account manager info and user's name
    const [accountManagerRows] = await DB.execute(
      `SELECT 
        am.id AS manager_id,
        am.email AS manager_email,
        am.name AS manager_name,
        pi.first_name AS user_name,
        u.email AS user_email
       FROM users u
       JOIN account_managers am ON u.account_manager_id = am.id
       LEFT JOIN personal_info pi ON u.personal_info_id = pi.id
       WHERE u.id = ?`,
      [user_id]
    );

    if (accountManagerRows.length === 0) {
      return res.status(404).json({ error: 'Account manager not found for this user' });
    }

    const {
      manager_id: assigned_to,
      manager_email: email,
      manager_name,
      user_name,
      user_email
    } = accountManagerRows[0];

    // Create the support ticket
    const [result] = await DB.execute(
      `INSERT INTO support_tickets 
        (user_id, assigned_to, subject, message, category, priority) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, assigned_to, subject, message, category, priority]
    );

    const [ticketRow] = await DB.execute(`SELECT * FROM support_tickets WHERE id = LAST_INSERT_ID()`);

    const ticket = ticketRow[0];

    // Send notification email
    if (email) {
      await sendSupportTicketEmail(email, ticket.id, subject, manager_name, user_name, category, priority, message, user_email);
      console.log(`Email sent to: ${email}`);
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tickets by account manager ID
exports.getTicketsByManagerId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await DB.execute(
      `SELECT * FROM support_tickets WHERE assigned_to = ? ORDER BY created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tickets by user ID
exports.getTicketsByUserId = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await DB.execute(
      `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ticket by ticket ID
exports.getTicketById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await DB.execute(
      `SELECT * FROM support_tickets WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching ticket by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update ticket
exports.updateTicket = async (req, res) => {
  const { id } = req.params;
  const { status, priority } = req.body;

  try {
    let query = `UPDATE support_tickets SET updated_at = NOW()`;
    const params = [];

    if (status) {
      query += `, status = ?`;
      params.push(status);
    }

    if (priority) {
      query += `, priority = ?`;
      params.push(priority);
    }

    if (status === 'resolved') {
      query += `, closed_at = NOW()`;
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await DB.execute(query, params);

    const [updatedTicketRows] = await DB.execute(
      `SELECT * FROM support_tickets WHERE id = ?`,
      [id]
    );

    res.json(updatedTicketRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
