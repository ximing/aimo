CREATE TABLE `push_devices` (
	`id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`provider` varchar(16) NOT NULL,
	`token` varchar(512) NOT NULL,
	`token_key` varchar(64) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `push_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_devices_token_key_unique` UNIQUE(`token_key`)
);
--> statement-breakpoint
CREATE INDEX `push_devices_uid_idx` ON `push_devices` (`uid`);