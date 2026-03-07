ALTER TABLE `users` ADD `sr_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sr_daily_limit` int DEFAULT 5 NOT NULL;