CREATE TABLE `spaced_repetition_cards` (
	`card_id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`memo_id` varchar(191) NOT NULL,
	`ease_factor` float NOT NULL DEFAULT 2.5,
	`interval` int NOT NULL DEFAULT 1,
	`repetitions` int NOT NULL DEFAULT 0,
	`next_review_at` timestamp(3) NOT NULL,
	`last_review_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `spaced_repetition_cards_card_id` PRIMARY KEY(`card_id`)
);
--> statement-breakpoint
CREATE TABLE `spaced_repetition_rules` (
	`rule_id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`mode` enum('include','exclude') NOT NULL,
	`filter_type` enum('category','tag') NOT NULL,
	`filter_value` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `spaced_repetition_rules_rule_id` PRIMARY KEY(`rule_id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `spaced_repetition_cards` (`user_id`);--> statement-breakpoint
CREATE INDEX `memo_id_idx` ON `spaced_repetition_cards` (`memo_id`);--> statement-breakpoint
CREATE INDEX `next_review_at_idx` ON `spaced_repetition_cards` (`next_review_at`);--> statement-breakpoint
CREATE INDEX `user_memo_idx` ON `spaced_repetition_cards` (`user_id`,`memo_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `spaced_repetition_rules` (`user_id`);