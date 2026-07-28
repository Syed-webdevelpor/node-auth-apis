const crypto = require('crypto');
const { generateToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");
const axios = require('axios');

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
            const [userdata] = await DB.execute(
                "SELECT id, is_verified, username, email, account_nature, kyc_completed, current_step FROM users WHERE id = ?",
                [userId]
            );
            if (!userdata.length) return res.status(404).json({ message: 'User not found' });
            const user = userdata[0];

            // Build base response payload
            const responsePayload = {
                status: 200,
                access_token,
                refresh_token,
                userId,
                deviceId,
                role: user.role,
                account_nature: user.account_nature,
                is_verified: user.is_verified,
                kyc_completed: user.kyc_completed,
                current_step: user.current_step
            };

            // --- Trading server login (proxy) ---
            // Fetch the user's password for trading server authentication
            const [userCred] = await DB.execute(
                'SELECT email, password FROM users WHERE id = ?',
                [userId]
            );

            const tradingServerUrl = process.env.TRADING_SERVER_URL;
            let trading_access_token = null;
            let trading_refresh_token = null;
            let trading_user_id = null;
            let trading_account_id = null;
            let trading_group_id = null;

            if (tradingServerUrl && userCred.length > 0) {
                try {
                    const tradingLoginRes = await axios.post(
                        `${tradingServerUrl}/auth/login`,
                        {
                            email: userCred[0].email,
                            password: userCred[0].password,
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                            timeout: 30000,
                        }
                    );

                    trading_access_token =
                        tradingLoginRes?.data?.access_token ?? null;
                    trading_refresh_token =
                        tradingLoginRes?.data?.refresh_token ?? null;
                    trading_user_id =
                        tradingLoginRes?.data?.user?.id ?? null;
                    trading_account_id =
                        tradingLoginRes?.data?.accountId ?? null;
                    trading_group_id =
                        tradingLoginRes?.data?.groupId ?? null;

                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 7);

                    const [existingSession] = await DB.execute(
                        `
                        SELECT id
                        FROM trading_sessions
                        WHERE user_id = ?
                        LIMIT 1
                        `,
                        [userId]
                    );

                    if (existingSession.length > 0) {
                        await DB.execute(
                            `
                            UPDATE trading_sessions
                            SET
                                trading_user_id = ?,
                                trading_access_token = ?,
                                trading_refresh_token = ?,
                                expires_at = ?,
                                is_active = 1,
                                updated_at = NOW()
                            WHERE user_id = ?
                            `,
                            [
                                trading_user_id,
                                trading_access_token,
                                trading_refresh_token,
                                expiresAt,
                                userId,
                            ]
                        );
                    } else {
                        await DB.execute(
                            `
                            INSERT INTO trading_sessions
                            (
                                user_id,
                                trading_user_id,
                                trading_access_token,
                                trading_refresh_token,
                                expires_at,
                                is_active
                            )
                            VALUES (?, ?, ?, ?, ?, 1)
                            `,
                            [
                                userId,
                                trading_user_id,
                                trading_access_token,
                                trading_refresh_token,
                                expiresAt,
                            ]
                        );
                    }
                } catch (tradingErr) {
                    console.error(
                        "Trading server auth/login error:",
                        tradingErr.response?.data || tradingErr.message
                    );

                    return res.status(502).json({
                        status: 502,
                        message: "Failed to login on trading server",
                        error:
                            tradingErr.response?.data?.message ||
                            tradingErr.response?.data ||
                            tradingErr.message,
                    });
                }
            }

            // Include trading fields in the response
            responsePayload.trading_access_token = trading_access_token;
            responsePayload.trading_refresh_token = trading_refresh_token;
            responsePayload.trading_user_id = trading_user_id;
            responsePayload.trading_account_id = trading_account_id;
            responsePayload.trading_group_id = trading_group_id;

            return res.status(200).json(responsePayload);
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