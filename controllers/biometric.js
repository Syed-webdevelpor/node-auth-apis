const crypto = require('crypto');
const { generateToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");
const { generateRegistrationOptions, verifyRegistrationResponse, verifyAuthenticationResponse , generateAuthenticationOptions } = require('@simplewebauthn/server');

// Configure WebAuthn
const rpName = 'INVESTAiN';
const rpID = 'server.investain.com';
const origin = `https://${rpID}`;

module.exports = {
    // Register new device and biometric credentials
    registerBiometricDevice: async (req, res) => {
        try {
            const { userId, deviceInfo, attestationResponse } = req.body;

            if (!userId || !deviceInfo || !attestationResponse) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Verify attestation
            const verification = await verifyRegistrationResponse({
                response: attestationResponse,
                expectedChallenge: async (challenge) => {
                    const [challengeRow] = await DB.execute(
                        'SELECT challenge FROM auth_challenges WHERE user_id = ? AND expires_at > NOW()',
                        [userId]
                    );
                    return challengeRow.length ? challengeRow[0].challenge : false;
                },
                expectedOrigin: origin,
                expectedRPID: rpID,
            });

            if (!verification.verified) {
                return res.status(400).json({ message: 'Device verification failed' });
            }

            // Create device record
            const deviceId = crypto.randomBytes(16).toString('hex');
            await DB.execute(
                'INSERT INTO user_devices (id, user_id, device_name, device_type, os_version) VALUES (?, ?, ?, ?, ?)',
                [deviceId, userId, deviceInfo.name, deviceInfo.type, deviceInfo.osVersion]
            );

            // Store biometric credentials
            const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
            await DB.execute(
                'INSERT INTO biometric_credentials (id, user_id, device_id, public_key, credential_id, counter) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    crypto.randomBytes(16).toString('hex'),
                    userId,
                    deviceId,
                    credentialPublicKey.toString('base64'),
                    credentialID.toString('base64'),
                    counter
                ]
            );

            // Clean up challenge
            await DB.execute('DELETE FROM auth_challenges WHERE user_id = ?', [userId]);

            res.status(201).json({
                message: 'Device registered successfully',
                deviceId
            });
        } catch (err) {
            console.error('Device registration error:', err);
            res.status(500).json({ message: 'Device registration failed' });
        }
    },

    // Generate registration options
    generateRegistrationOptions: async (req, res) => {
        try {
            const { userId, email } = req.body;
    
            if (!userId || !email) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
    
            // Generate challenge
            const challenge = crypto.randomBytes(32).toString('base64');
    
            // Store challenge
            await DB.execute(
                'INSERT INTO auth_challenges (id, user_id, challenge, expires_at) VALUES (?, ?, ?, ?)',
                [crypto.randomBytes(16).toString('hex'), userId, challenge, new Date(Date.now() + 300000)]
            );
    
            // Get user's existing devices
            const [devices] = await DB.execute(
                'SELECT credential_id FROM biometric_credentials WHERE user_id = ?',
                [userId]
            );
    
            const excludeCredentials = devices.map(device => ({
                id: Buffer.from(device.credential_id, 'base64'),
                type: 'public-key',
            }));
    
            // Convert string userId to Uint8Array
            const userID = Uint8Array.from(userId, c => c.charCodeAt(0));
    
            const options = generateRegistrationOptions({
                rpName: 'INVESTAiN',
                rpID: 'server.investain.com',
                userID: userID, // Now using Uint8Array
                userName: email,
                challenge: Buffer.from(challenge, 'base64'),
                excludeCredentials,
                authenticatorSelection: {
                    residentKey: 'required',
                    userVerification: 'required',
                },
            });
    console.log(options);
            res.status(200).json(options);
        } catch (err) {
            console.error('Options generation error:', err);
            res.status(500).json({ 
                message: 'Failed to generate registration options',
                error: err.message
            });
        }
    },

    // Generate authentication options
    generateAuthenticationOptions: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            // Get user
            const [user] = await DB.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (!user.length) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get user's credentials
            const [credentials] = await DB.execute(
                'SELECT credential_id FROM biometric_credentials WHERE user_id = ?',
                [user[0].id]
            );

            if (!credentials.length) {
                return res.status(400).json({ message: 'No registered devices' });
            }

            const allowCredentials = credentials.map(cred => ({
                id: Buffer.from(cred.credential_id, 'base64'),
                type: 'public-key',
            }));

            const challenge = crypto.randomBytes(32).toString('base64');

            // Store challenge
            await DB.execute(
                'INSERT INTO auth_challenges (id, user_id, challenge, expires_at) VALUES (?, ?, ?, ?)',
                [crypto.randomBytes(16).toString('hex'), user[0].id, challenge, new Date(Date.now() + 300000)]
            );

            const options = generateAuthenticationOptions({
                challenge: Buffer.from(challenge, 'base64'),
                allowCredentials,
                userVerification: 'required',
            });

            res.status(200).json(options);
        } catch (err) {
            console.error('Auth options error:', err);
            res.status(500).json({ message: 'Failed to generate authentication options' });
        }
    },

    // Verify authentication
    verifyAuthentication: async (req, res) => {
        try {
            const { email, assertionResponse, deviceInfo } = req.body;

            if (!email || !assertionResponse) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Get user
            const [user] = await DB.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (!user.length) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get credential
            const [credential] = await DB.execute(
                `SELECT bc.*, ud.device_name, ud.device_type 
       FROM biometric_credentials bc
       JOIN user_devices ud ON bc.device_id = ud.id
       WHERE bc.user_id = ? AND bc.credential_id = ?`,
                [user[0].id, Buffer.from(assertionResponse.id, 'base64').toString('base64')]
            );

            if (!credential.length) {
                return res.status(404).json({ message: 'Credential not found' });
            }

            // Verify assertion
            const verification = await verifyAuthenticationResponse({
                response: assertionResponse,
                expectedChallenge: async (challenge) => {
                    const [challengeRow] = await DB.execute(
                        'SELECT challenge FROM auth_challenges WHERE user_id = ? AND expires_at > NOW()',
                        [user[0].id]
                    );
                    return challengeRow.length ? challengeRow[0].challenge : false;
                },
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator: {
                    credentialID: Buffer.from(credential[0].credential_id, 'base64'),
                    credentialPublicKey: Buffer.from(credential[0].public_key, 'base64'),
                    counter: credential[0].counter,
                },
            });

            if (!verification.verified) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

            // Update credential counter
            await DB.execute(
                'UPDATE biometric_credentials SET counter = ? WHERE id = ?',
                [verification.authenticationInfo.newCounter, credential[0].id]
            );

            // Update device last login
            if (deviceInfo) {
                await DB.execute(
                    'UPDATE user_devices SET last_login = NOW() WHERE id = ?',
                    [credential[0].device_id]
                );
            }

            // Clean up challenge
            await DB.execute('DELETE FROM auth_challenges WHERE user_id = ?', [user[0].id]);

            // Generate tokens
            const access_token = generateToken({ id: user[0].id });
            const refresh_token = generateToken({ id: user[0].id }, false);
            const md5Refresh = crypto.createHash('md5').update(refresh_token).digest('hex');

            await DB.execute(
                'INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)',
                [user[0].id, md5Refresh]
            );

            res.status(200).json({
                status: 200,
                access_token,
                refresh_token,
                userId: user[0].id,
                deviceId: credential[0].device_id,
                deviceName: credential[0].device_name,
                deviceType: credential[0].device_type
            });
        } catch (err) {
            console.error('Authentication error:', err);
            res.status(500).json({ message: 'Authentication failed' });
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
                `SELECT ud.id, ud.device_name, ud.device_type, ud.os_version, ud.last_login, ud.created_at,
              COUNT(bc.id) as biometric_count
       FROM user_devices ud
       LEFT JOIN biometric_credentials bc ON ud.id = bc.device_id
       WHERE ud.user_id = ?
       GROUP BY ud.id`,
                [userId]
            );

            res.status(200).json(devices);
        } catch (err) {
            console.error('Get devices error:', err);
            res.status(500).json({ message: 'Failed to get devices' });
        }
    },

    // Revoke device
    revokeDevice: async (req, res) => {
        try {
            const { userId, deviceId } = req.body;

            if (!userId || !deviceId) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Delete biometric credentials first
            await DB.execute(
                'DELETE FROM biometric_credentials WHERE user_id = ? AND device_id = ?',
                [userId, deviceId]
            );

            // Then delete device
            const [result] = await DB.execute(
                'DELETE FROM user_devices WHERE id = ? AND user_id = ?',
                [deviceId, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Device not found' });
            }

            res.status(200).json({ message: 'Device revoked successfully' });
        } catch (err) {
            console.error('Revoke device error:', err);
            res.status(500).json({ message: 'Failed to revoke device' });
        }
    }
};