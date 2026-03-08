CREATE TABLE `user_feature_configs` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`feature` varchar(50) NOT NULL,
	`user_model_id` varchar(191),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_feature_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_feature_configs_user_feature_idx` UNIQUE(`user_id`,`feature`)
);
