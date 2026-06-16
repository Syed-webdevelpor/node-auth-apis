function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const masked = name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

module.exports = function auditLogger(event) {
  // event: { action, outcome, userId, email, ip, route, status, details }
  const log = {
    timestamp: new Date().toISOString(),
    domain: 'crm.sso',
    ...event,
    email_masked: maskEmail(event?.email),
  };

  // Detailed audit logging (structured)
  console.log('[AUDIT]', JSON.stringify(log));
};

