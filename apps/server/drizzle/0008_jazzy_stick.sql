CREATE TABLE `in_app_notifications` (
	`notification_id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`memo_id` varchar(191),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `in_app_notifications_notification_id` PRIMARY KEY(`notification_id`)
);
--> statement-breakpoint
CREATE INDEX `ian_user_id_idx` ON `in_app_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `ian_user_created_at_idx` ON `in_app_notifications` (`user_id`,`created_at`);