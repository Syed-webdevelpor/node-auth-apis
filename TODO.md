# TODO: Add reCAPTCHA to verifyOtp Controller - COMPLETE ✅

## Steps:
1. [x] Updated `controllers/otpVerification.js`: Added imports, `recaptchaToken` validation, full reCAPTCHA v3 verification (score >=0.7, action='verifyOtp'), logging via `logRecaptcha`, before Twilio OTP check.
2. [ ] Test: Use Postman/cURL to POST /api/otpVerification/verify-otp (adjust base path) with body `{ "phoneNumber": "+123...", "code": "123456", "recaptchaToken": "frontend_generated_token" }`. Expect 403 on invalid token/low score, 200 on pass+valid OTP.
3. [ ] Check `recaptcha_logs` table/DB for entries (route=/otpVerification/verify-otp).
4. [x] [Complete] Changes implemented successfully. Ensure `RECAPTCHA_SECRET_KEY` in .env, restart server (`npm start` or nodemon).

Next: 
- Open `public/verifyOtpDemo.html` in browser for frontend test demo (update SITE_KEY, BACKEND_URL, serve via `npm start`).
- Use Postman: POST /otpVerification/verify-otp body JSON as above.
Manual testing recommended.
Frontend docs in `public/verifyOtpDemo.html` (self-contained HTML/JS example).
