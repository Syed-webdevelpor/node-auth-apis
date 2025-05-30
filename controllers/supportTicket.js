const DB = require("../dbConnection.js");
const { sendSupportTicketEmail } = require('../middlewares/sesMail.js')

// Create ticket
exports.createTicket = async (req, res) => {
  const { user_id, subject, message, category, priority } = req.body;

  try {
const accountManagerResult = await DB.query(
      `SELECT am.id, am.email, am.name AS manager_name, u.name AS user_name, u.email AS user_email
       FROM account_managers am
       JOIN users u ON u.account_manager_id = am.id
       WHERE u.id = $1`,
      [user_id]
    );

    if (accountManagerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account manager not found for this user' });
    }

    const { id: assigned_to, email, manager_name, user_name, user_email } = accountManagerResult.rows[0];

    // 2. Create the support ticket
    const result = await DB.query(
      `INSERT INTO support_tickets 
      (user_id, assigned_to, subject, message, category, priority) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, assigned_to, subject, message, category, priority]
    );

    const ticket = result.rows[0];

    // Example email send
    if (email) {
      sendSupportTicketEmail(email, ticket.id, subject, manager_name, user_name, category, priority, message, user_email);
      console.log(`Email would be sent to: ${email}`);
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get by account manager id
exports.getTicketsByManagerId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await DB.query(
      `SELECT * FROM support_tickets WHERE assigned_to = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get by user id
exports.getTicketsByUserId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ticket by ticket ID
exports.getTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await DB.query(
      `SELECT * FROM support_tickets WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
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
      params.push(status);
      query += `, status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += `, priority = $${params.length}`;
    }
    if (status === 'resolved') {
      query += `, closed_at = NOW()`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await DB.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
