SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `refresh_tokens` (
  `user_id` VARCHAR(36) NOT NULL,
  `token` varchar(35) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` varchar(40) NOT NULL,
  `password` varchar(70) NOT NULL,
  `personal_info_id` VARCHAR(36) DEFAULT NULL,
  `financial_info_id` VARCHAR(36) DEFAULT NULL,
  `account_info_id` VARCHAR(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`personal_info_id`) REFERENCES `personal_info`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`financial_info_id`) REFERENCES `financial_info`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`account_info_id`) REFERENCES `account_info`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `personal_info` (
  `id` VARCHAR(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `first_name` varchar(30) NOT NULL,
  `last_name` varchar(30) NOT NULL,
  `phone_no` varchar(30) NOT NULL,
  `gender` varchar(10) NOT NULL,
  `dob` varchar(30) NOT NULL,
  `Nationality` varchar(40) NOT NULL,
  `street` varchar(150) NOT NULL,
  `Address` varchar(150) NOT NULL,
  `State` varchar(30) NOT NULL,
  `Country` varchar(30) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `financial_info` (
  `id` VARCHAR(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `TIN` varchar(70) NOT NULL,
  `industry` varchar(70) NOT NULL,
  `employment_status` varchar(70) NOT NULL,
  `annual_income` DECIMAL(15, 2) NOT NULL,
  `value_of_savings` DECIMAL(15, 2) NOT NULL,
  `total_net_assets` DECIMAL(15, 2) NOT NULL,
  `source_of_wealth` varchar(70) NOT NULL,
  `expected_initial_amount_of_depsoit` DECIMAL(15, 2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `account_info` (
  `id` VARCHAR(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `trading_experience` varchar(70) NOT NULL,
  `platform` varchar(70) NOT NULL,
  `base_currency` varchar(70) NOT NULL,
  `leverage` varchar(70) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `transaction_details` (
  `id` VARCHAR(36) NOT NULL,
  `account_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `transaction_type` varchar(70) NOT NULL,
  `status` varchar(70) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `accounts` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `total_equiti` varchar(70) NOT NULL,
  `total_deposit` DECIMAL(15, 2) NOT NULL,
  `total_balance` DECIMAL(15, 2) NOT NULL,
  `total_withdraw` DECIMAL(15, 2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;
