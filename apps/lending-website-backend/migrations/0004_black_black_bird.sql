CREATE TABLE `loan_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`lender` text NOT NULL,
	`amount` integer NOT NULL,
	`on_chain_ref` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loan_listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_loan_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`borrower` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`apy` real NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`raised_amount` integer DEFAULT 0 NOT NULL,
	`repaid` integer DEFAULT 0 NOT NULL,
	`lender` text,
	`due_date` text,
	`on_chain_ref` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_loan_listings`("id", "borrower", "amount", "currency", "apy", "duration", "status", "raised_amount", "repaid", "lender", "due_date", "on_chain_ref", "created_at", "updated_at") SELECT "id", "borrower", "amount", "currency", "apy", "duration", "status", "raised_amount", "repaid", "lender", "due_date", "on_chain_ref", "created_at", "updated_at" FROM `loan_listings`;--> statement-breakpoint
DROP TABLE `loan_listings`;--> statement-breakpoint
ALTER TABLE `__new_loan_listings` RENAME TO `loan_listings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;