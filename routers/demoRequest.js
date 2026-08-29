const express = require('express');
const axios = require('axios');
const router = express.Router();
const { sendDemoRequestEmail } = require('../middlewares/sesMail'); // Adjust path as needed
const { logRecaptcha } = require('../middlewares/authentication.js');

// Validation helper
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// POST /api/request-demo
router.post('/request-demo', async (req, res) => {
    const { recaptchaToken } = req.body;

    // ---- reCAPTCHA verification ----
    const recaptchaSecret = process.env.DEMO_RECAPTCHA_SECRET_KEY;

    if (!recaptchaToken) {
        await logRecaptcha({
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || '',
            recaptcha_score: null,
            recaptcha_action: 'requestDemo',
            route: req.originalUrl,
            status: 'missing_token',
        });

        return res.status(400).json({
            success: false,
            message: 'reCAPTCHA token is required.',
        });
    }

    if (!recaptchaSecret) {
        return res.status(500).json({
            success: false,
            message: 'reCAPTCHA not configured.',
        });
    }

    let recaptchaData;
    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({
                secret: recaptchaSecret,
                response: recaptchaToken,
                remoteip: req.ip,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        recaptchaData = response.data;
    } catch (recaptchaError) {
        console.error('Demo request reCAPTCHA verification error:', recaptchaError.message);

        await logRecaptcha({
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || '',
            recaptcha_score: null,
            recaptcha_action: 'requestDemo',
            route: req.originalUrl,
            status: 'error',
        });

        return res.status(500).json({
            success: false,
            message: 'Server error during reCAPTCHA verification.',
        });
    }

    if (!recaptchaData.success) {
        await logRecaptcha({
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || '',
            recaptcha_score: recaptchaData.score || null,
            recaptcha_action: recaptchaData.action || 'requestDemo',
            route: req.originalUrl,
            status: 'fail',
        });

        return res.status(403).json({
            success: false,
            message: 'reCAPTCHA verification failed.',
        });
    }

    // reCAPTCHA passed
    req.recaptcha = { status: 'ok', score: recaptchaData.score || null };

    await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: recaptchaData.score || null,
        recaptcha_action: recaptchaData.action || 'requestDemo',
        route: req.originalUrl,
        status: 'pass',
    });

    try {
        const {
            name,
            company,
            email,
            phone,
            country,
            website,
            type,
            platform,
            users,
            meeting,
            requirements
        } = req.body;

        // Validate required fields
        const errors = {};

        if (!name || name.trim() === '') {
            errors.name = 'Full name is required.';
        }

        if (!company || company.trim() === '') {
            errors.company = 'Company name is required.';
        }

        if (!email || email.trim() === '') {
            errors.email = 'Business email is required.';
        } else if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address.'
            });
        }

        // If there are validation errors, return them
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed.',
                errors: errors
            });
        }

        // Prepare data for email
        const demoData = {
            name: name.trim(),
            company: company.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : null,
            country: country ? country.trim() : null,
            website: website ? website.trim() : null,
            type: type ? type.trim() : null,
            platform: platform ? platform.trim() : null,
            users: users ? users.trim() : null,
            meeting: meeting ? meeting.trim() : null,
            requirements: requirements ? requirements.trim() : null,
            submittedAt: new Date().toISOString()
        };

        // Send email to admin
        const result = await sendDemoRequestEmail(demoData);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Demo request submitted successfully.'
            });
        } else {
            throw new Error('Failed to send email');
        }

    } catch (error) {
        console.error('Demo request error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit demo request. Please try again later.'
        });
    }
});

module.exports = router;