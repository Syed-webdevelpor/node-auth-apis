const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'versionData.json');

const getVersion = (req, res) => {
  fs.readFile(versionFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading version data:', err);
      return res.status(500).json({ message: 'Failed to read version data' });
    }
    try {
      const versionData = JSON.parse(data);
      res.json(versionData);
    } catch (parseErr) {
      console.error('Error parsing version data:', parseErr);
      res.status(500).json({ message: 'Failed to parse version data' });
    }
  });
};

const updateVersion = (req, res) => {
  const newVersionData = req.body;
  if (!newVersionData || typeof newVersionData !== 'object') {
    return res.status(400).json({ message: 'Invalid version data' });
  }
  fs.writeFile(versionFilePath, JSON.stringify(newVersionData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing version data:', err);
      return res.status(500).json({ message: 'Failed to update version data' });
    }
    res.json({ message: 'Version data updated successfully' });
  });
};

module.exports = {
  getVersion,
  updateVersion,
};
