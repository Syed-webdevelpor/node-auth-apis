const crypto = require('crypto');
const { generateToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");

module.exports = {
    // Register device (simplified for local_auth)
    registerDevice: async (req, res) => {
        try {
            const { userId, deviceInfo } = req.body;

            if (!userId || !deviceInfo) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Create device record
            const deviceId = crypto.randomBytes(16).toString('hex');
            await DB.execute(
                'INSERT INTO user_devices (id, user_id, device_name, device_type, os_version, local_auth_enabled) VALUES (?, ?, ?, ?, ?, ?)',
                [deviceId, userId, deviceInfo.name, deviceInfo.type, deviceInfo.osVersion, true]
            );

            res.status(201).json({
                message: 'Device registered successfully',
                deviceId
            });
        } catch (err) {
            console.error('Device registration error:', err);
            res.status(500).json({ message: 'Device registration failed' });
        }
    },

    // Verify local authentication
    verifyLocalAuth: async (req, res) => {
        try {
            const { userId, deviceId } = req.body;

            // Verify device belongs to user
            const [device] = await DB.execute(
                'SELECT id FROM user_devices WHERE user_id = ? AND id = ? AND local_auth_enabled = TRUE',
                [userId, deviceId]
            );

            if (!device.length) {
                return res.status(401).json({ message: 'Device not registered or local auth not enabled' });
            }

            // Generate tokens
            const access_token = generateToken({ id: userId });
            const refresh_token = generateToken({ id: userId }, false);
            const md5Refresh = crypto.createHash('md5').update(refresh_token).digest('hex');

            await DB.execute(
                'INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)',
                [userId, md5Refresh]
            );

            // Update device last login
            await DB.execute(
                'UPDATE user_devices SET last_login = NOW() WHERE id = ?',
                [deviceId]
            );

            res.status(200).json({
                status: 200,
                access_token,
                refresh_token,
                userId,
                deviceId
            });
        } catch (err) {
            console.error('Local auth verification error:', err);
            res.status(500).json({ message: 'Local authentication failed' });
        }
    },

    // Get user devices
    getUserDevices: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const [devices] = await DB.execute(
                `SELECT id, device_name, device_type, os_version, last_login, created_at, local_auth_enabled
                 FROM user_devices 
                 WHERE user_id = ?`,
                [userId]
            );

            res.status(200).json(devices);
        } catch (err) {
            console.error('Get devices error:', err);
            res.status(500).json({ message: 'Failed to get devices' });
        }
    },

    // Toggle local auth for device
    toggleLocalAuth: async (req, res) => {
        try {
            const { userId, deviceId, enable } = req.body;

            await DB.execute(
                'UPDATE user_devices SET local_auth_enabled = ? WHERE id = ? AND user_id = ?',
                [enable, deviceId, userId]
            );

            res.status(200).json({ 
                message: `Local auth ${enable ? 'enabled' : 'disabled'}` 
            });
        } catch (err) {
            console.error('Toggle local auth error:', err);
            res.status(500).json({ message: 'Failed to update local auth setting' });
        }
    },

    // Revoke device
    revokeDevice: async (req, res) => {
        try {
            const { userId, deviceId } = req.body;

            // Delete device
            const [result] = await DB.execute(
                'DELETE FROM user_devices WHERE id = ? AND user_id = ?',
                [deviceId, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Device not found' });
            }

            // Clean up any related data
            await DB.execute(
                'DELETE FROM refresh_tokens WHERE user_id = ? AND token LIKE ?',
                [userId, `%${deviceId}%`]
            );

            res.status(200).json({ message: 'Device revoked successfully' });
        } catch (err) {
            console.error('Revoke device error:', err);
            res.status(500).json({ message: 'Failed to revoke device' });
        }
    }
};