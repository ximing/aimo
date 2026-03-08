ALTER TABLE `review_sessions` ADD `profile_id` varchar(191);--> statement-breakpoint
CREATE INDEX `profile_id_idx` ON `review_sessions` (`profile_id`);