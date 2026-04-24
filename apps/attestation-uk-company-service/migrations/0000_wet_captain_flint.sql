CREATE TABLE `attestation_records` (
	`wallet_address` text PRIMARY KEY NOT NULL,
	`company_number` text NOT NULL,
	`company_name` text NOT NULL,
	`director_name` text NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`attestation_address` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attestation_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`company_number` text NOT NULL,
	`director_name` text NOT NULL,
	`company_email` text NOT NULL,
	`challenge_message` text NOT NULL,
	`otp` text NOT NULL,
	`otp_expires_at` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
