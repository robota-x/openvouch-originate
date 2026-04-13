CREATE TABLE `auth_nonces` (
	`address` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loan_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`borrower` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`apy` real NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`lender` text,
	`on_chain_ref` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`address` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`updated_at` integer NOT NULL
);
