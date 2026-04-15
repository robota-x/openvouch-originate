-- Default backfills existing rows with the current timestamp.
-- New rows always receive an explicit createdAt from application code.
ALTER TABLE `profiles` ADD `created_at` integer NOT NULL DEFAULT (unixepoch());