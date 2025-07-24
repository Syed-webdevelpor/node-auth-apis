const db = require('../dbConnection');

const getVersion = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT version FROM version WHERE id = 1');
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Version not found' });
    }
    // Assuming version column stores JSON string or object
    let versionData;
    try {
      versionData = typeof rows[0].version === 'string' ? JSON.parse(rows[0].version) : rows[0].version;
    } catch (err) {
      versionData = rows[0].version;
    }
    res.json(versionData);
  } catch (err) {
    console.error('Error fetching version data:', err);
    res.status(500).json({ message: 'Failed to fetch version data' });
  }
};

const updateVersion = async (req, res) => {
  const newVersionData = req.body;
  if (!newVersionData || typeof newVersionData !== 'object') {
    return res.status(400).json({ message: 'Invalid version data' });
  }
  try {
    const versionString = JSON.stringify(newVersionData);
    // Try to update existing row
    const [result] = await db.query('UPDATE version SET version = ? WHERE id = 1', [versionString]);
    if (result.affectedRows === 0) {
      // Insert if no row updated
      await db.query('INSERT INTO version (id, version) VALUES (1, ?)', [versionString]);
    }
    res.json({ message: 'Version data updated successfully' });
  } catch (err) {
    console.error('Error updating version data:', err);
    res.status(500).json({ message: 'Failed to update version data' });
  }
};

module.exports = {
  getVersion,
  updateVersion,
};
