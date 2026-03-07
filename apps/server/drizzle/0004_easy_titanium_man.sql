CREATE TABLE `review_sessions` (
	`session_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`scope` enum('all','category','tag','recent') NOT NULL DEFAULT 'all',
	`scope_value` varchar(255),
	`status` enum('active','completed','abandoned') NOT NULL DEFAULT 'active',
	`score` int,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`completed_at` timestamp(3),
	CONSTRAINT `review_sessions_session_id` PRIMARY KEY(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `review_items` (
	`item_id` varchar(191) NOT NULL,
	`session_id` varchar(191) NOT NULL,
	`memo_id` varchar(191) NOT NULL,
	`question` text NOT NULL,
	`user_answer` text,
	`ai_feedback` text,
	`mastery` enum('remembered','fuzzy','forgot'),
	`order` int NOT NULL DEFAULT 0,
	CONSTRAINT `review_items_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE INDEX `uid_idx` ON `review_sessions` (`uid`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `review_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `session_id_idx` ON `review_items` (`session_id`);