CREATE TABLE `user_models` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`api_base_url` varchar(500),
	`api_key` varchar(500) NOT NULL,
	`model_name` varchar(100) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_models_user_id_idx` ON `user_models` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_models_is_default_idx` ON `user_models` (`is_default`);