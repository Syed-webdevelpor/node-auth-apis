# TODO: Investain SSO (shared JWT cookie)

- [x] Add SSO JWT service (services/investainSsoTokenService.js)
- [x] Add cookie helpers (utils/investainSsoCookie.js)
- [x] Add SSO auth middleware (middlewares/investainSsoAuthentication.js)

- [x] Wire `cookie-parser` into app.js
- [ ] CRM login: generate SSO JWT + set `auth_token` cookie after successful login
- [ ] CRM logout: clear `auth_token` cookie
- [ ] Trading account endpoints: accept/validate SSO cookie (email-based)
- [x] Update sample.env with JWT_SECRET and JWT_EXPIRES_IN

- [ ] Add basic error handling/logging for invalid/missing cookies
- [ ] Run server and verify Set-Cookie/clear-cookie behavior

