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
  `TIN` varchar(70) NOT NULL,
  `employment` varchar(70) NOT NULL,
  `employment_status` varchar(70) NOT NULL,
  `annual_income` varchar(70) NOT NULL,
  `value_of_savings` varchar(70) NOT NULL,
  `total_net_assets` varchar(70) NOT NULL,
  `source_of_wealth` varchar(70) NOT NULL,
  `expected_initial_amount_of_depsoit` varchar(70) NOT NULL,
  `email` varchar(40) NOT NULL,
  `password` varchar(70) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `refresh_tokens`
  ADD KEY `user_id` (`user_id`),
  ADD KEY `token` (`token`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone_no` (`phone_no`);


ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;
