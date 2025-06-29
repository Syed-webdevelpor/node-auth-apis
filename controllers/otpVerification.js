const db = require("../dbConnection.js");
const { sendSMS } = require('../middlewares/sns.js');

// Request OTP
exports.requestOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  try {
    await db.query(
      'INSERT INTO otp_verification (phone_number, otp_code, expires_at) VALUES (?, ?, ?)',
      [phoneNumber, otp, expiresAt]
    );

    await sendSMS(phoneNumber, `Your verification code is: ${otp}`);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Phone number and OTP code are required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM otp_verification WHERE phone_number = ? AND otp_code = ? AND expires_at > NOW() AND is_verified = 0 ORDER BY id DESC LIMIT 1',
      [phoneNumber, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.query(
      'UPDATE otp_verification SET is_verified = 1 WHERE id = ?',
      [rows[0].id]
    );

    res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};
