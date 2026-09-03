-- App Attest registration persistence.
--
-- Stores only the *public* key derived from an App Attest credential
-- certificate. Private keys are never stored.
--
-- Run this migration against the same database used by the backend.
CREATE TABLE IF NOT EXISTS `app_attest_keys` (
  `id` VARCHAR(36) NOT NULL,
  `app_attest_key_id` VARCHAR(255) NOT NULL,
  `public_key` TEXT NOT NULL COMMENT 'base64(x963 uncompressed EC point)',
  `counter` INT UNSIGNED NOT NULL DEFAULT 0,
  `phone_number` VARCHAR(32) DEFAULT NULL COMMENT 'normalized E.164',
  `user_id` VARCHAR(36) DEFAULT NULL,
  `environment` VARCHAR(32) NOT NULL DEFAULT 'production',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_attest_key_id` (`app_attest_key_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;