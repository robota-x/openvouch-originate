CREATE TABLE `attestation_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wallet` text NOT NULL,
	`website` text NOT NULL,
	`claim_url` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attestations` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`provider_id` text NOT NULL,
	`icon` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`issued_at` text NOT NULL,
	`on_chain_ref` text,
	`metadata` text
);
--> statement-breakpoint
ALTER TABLE `loan_listings` ADD `repaid` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `loan_listings` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `trust_score` integer;