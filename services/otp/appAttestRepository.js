const { v4: uuidv4 } = require("uuid");
const DB = require("../../dbConnection.js");

/**
 * Persistence for App Attest registrations. Reuses the existing project DB
 * connection. Only ever stores the public key (never private keys).
 */
async function createRegistration({ keyId, publicKeyBase64, counter = 0, phoneNumber = null, userId = null, environment = "production" }) {
  const [result] = await DB.execute(
    `INSERT INTO app_attest_keys
       (id, app_attest_key_id, public_key, counter, phone_number, user_id, environment)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       public_key = VALUES(public_key),
       environment = VALUES(environment),
       updated_at = current_timestamp()`,
    [uuidv4(), keyId, publicKeyBase64, counter, phoneNumber, userId, environment]
  );
  return result;
}

async function findByKeyId(keyId) {
  const [rows] = await DB.execute(
    `SELECT id, app_attest_key_id AS keyId, public_key AS publicKey,
            counter, phone_number AS phoneNumber, user_id AS userId,
            environment, created_at AS createdAt, updated_at AS updatedAt
     FROM app_attest_keys
     WHERE app_attest_key_id = ?
     LIMIT 1`,
    [keyId]
  );
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

async function updateCounter(keyId, counter) {
  const [result] = await DB.execute(
    `UPDATE app_attest_keys
       SET counter = ?, updated_at = current_timestamp()
     WHERE app_attest_key_id = ?`,
    [counter, keyId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createRegistration,
  findByKeyId,
  updateCounter,
};