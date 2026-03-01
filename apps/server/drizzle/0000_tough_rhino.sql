CREATE TABLE `users` (
	`uid` varchar(191) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`password` varchar(255) NOT NULL,
	`salt` varchar(255) NOT NULL,
	`nickname` varchar(100),
	`avatar` varchar(500),
	`status` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `users_uid` PRIMARY KEY(`uid`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`category_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_category_id` PRIMARY KEY(`category_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`tag_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20),
	`usage_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_tag_id` PRIMARY KEY(`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `memos` (
	`memo_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`category_id` varchar(191),
	`content` text NOT NULL,
	`type` varchar(50) DEFAULT 'text',
	`source` varchar(500),
	`attachments` json,
	`tag_ids` json,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `memos_memo_id` PRIMARY KEY(`memo_id`)
);
--> statement-breakpoint
CREATE TABLE `memo_relations` (
	`relation_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`source_memo_id` varchar(191) NOT NULL,
	`target_memo_id` varchar(191) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `memo_relations_relation_id` PRIMARY KEY(`relation_id`),
	CONSTRAINT `source_target_unique` UNIQUE(`source_memo_id`,`target_memo_id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`attachment_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`storage_type` varchar(20) NOT NULL,
	`path` varchar(500) NOT NULL,
	`bucket` varchar(255),
	`prefix` varchar(255),
	`endpoint` varchar(500),
	`region` varchar(100),
	`is_public_bucket` varchar(10),
	`multimodal_model_hash` varchar(255),
	`properties` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_attachment_id` PRIMARY KEY(`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`conversation_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_conversations_conversation_id` PRIMARY KEY(`conversation_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`message_id` varchar(191) NOT NULL,
	`conversation_id` varchar(191) NOT NULL,
	`role` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`sources` json,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_messages_message_id` PRIMARY KEY(`message_id`)
);
--> statement-breakpoint
CREATE TABLE `daily_recommendations` (
	`recommendation_id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`date` varchar(10) NOT NULL,
	`memo_ids` json NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_recommendations_recommendation_id` PRIMARY KEY(`recommendation_id`),
	CONSTRAINT `uid_date_unique` UNIQUE(`uid`,`date`)
);
--> statement-breakpoint
CREATE TABLE `push_rules` (
	`id` varchar(191) NOT NULL,
	`uid` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`push_time` int NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`channels` text,
	`enabled` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `push_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `table_migrations` (
	`table_name` varchar(191) NOT NULL,
	`current_version` int NOT NULL,
	`last_migrated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `table_migrations_table_name` PRIMARY KEY(`table_name`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memos` ADD CONSTRAINT `memos_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memos` ADD CONSTRAINT `memos_category_id_categories_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_source_memo_id_memos_memo_id_fk` FOREIGN KEY (`source_memo_id`) REFERENCES `memos`(`memo_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_target_memo_id_memos_memo_id_fk` FOREIGN KEY (`target_memo_id`) REFERENCES `memos`(`memo_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversation_id_ai_conversations_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`conversation_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_recommendations` ADD CONSTRAINT `daily_recommendations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_rules` ADD CONSTRAINT `push_rules_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `phone_idx` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `categories` (`uid`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `tags` (`uid`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `memos` (`uid`);--> statement-breakpoint
CREATE INDEX `category_id_idx` ON `memos` (`category_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `memos` (`created_at`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `memo_relations` (`uid`);--> statement-breakpoint
CREATE INDEX `source_memo_id_idx` ON `memo_relations` (`source_memo_id`);--> statement-breakpoint
CREATE INDEX `target_memo_id_idx` ON `memo_relations` (`target_memo_id`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `attachments` (`uid`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `ai_conversations` (`uid`);--> statement-breakpoint
CREATE INDEX `conversation_id_idx` ON `ai_messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `daily_recommendations` (`uid`);--> statement-breakpoint
CREATE INDEX `uid_idx` ON `push_rules` (`uid`);