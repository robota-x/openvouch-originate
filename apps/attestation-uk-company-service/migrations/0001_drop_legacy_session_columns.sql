PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_attestation_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`company_number` text NOT NULL,
	`director_name` text NOT NULL,
	`challenge_message` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);

INSERT INTO `__new_attestation_sessions` (
	`id`,
	`wallet_address`,
	`company_number`,
	`director_name`,
	`challenge_message`,
	`status`,
	`created_at`
)
SELECT
	`id`,
	`wallet_address`,
	`company_number`,
	`director_name`,
	`challenge_message`,
	`status`,
	`created_at`
FROM `attestation_sessions`;

DROP TABLE `attestation_sessions`;
ALTER TABLE `__new_attestation_sessions` RENAME TO `attestation_sessions`;

PRAGMA foreign_keys=ON;
