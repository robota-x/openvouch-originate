CREATE TABLE `chain_events` (
	`tx_signature` text PRIMARY KEY NOT NULL,
	`block_time` integer NOT NULL,
	`program_id` text NOT NULL,
	`contract_type` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `loan_listings` ADD `raised_amount` real DEFAULT 0 NOT NULL;