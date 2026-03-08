CREATE TABLE `review_profiles` (
	`profile_id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`scope` enum('all','category','tag','recent') NOT NULL DEFAULT 'all',
	`filter_values` json,
	`recent_days` int,
	`question_count` int NOT NULL DEFAULT 10,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `review_profiles_profile_id` PRIMARY KEY(`profile_id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `review_profiles` (`user_id`);