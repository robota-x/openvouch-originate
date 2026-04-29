CREATE TABLE `identity_records` (
	`wallet_address` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`dob` text NOT NULL,
	`country` text NOT NULL,
	`document_number` text,
	`document_type` text,
	`verified_at` integer NOT NULL,
	`reference` text NOT NULL
);
