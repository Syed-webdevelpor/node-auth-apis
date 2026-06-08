# TODO

- [x] Update `controllers/user.js` login response to return trading fields only when `platform === 'mobile'`.
- [x] (Performance) Skip calling trading server `/auth/login` when `platform !== 'mobile'`.
- [ ] Verify behavior by running login endpoint with `platform: mobile` and `platform: web` (or without platform, if that’s possible).


