CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attachment_id` text NOT NULL,
	`uid` text NOT NULL,
	`filename` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_type` text NOT NULL,
	`path` text NOT NULL,
	`bucket` text,
	`prefix` text,
	`endpoint` text,
	`region` text,
	`is_public_bucket` text,
	`multimodal_model_hash` text,
	`properties` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_attachment_id_unique` ON `attachments` (`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attachments_attachment_id` ON `attachments` (`attachment_id`);--> statement-breakpoint
CREATE INDEX `idx_attachments_uid` ON `attachments` (`uid`);--> statement-breakpoint
CREATE TABLE `memo_relations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`relation_id` text NOT NULL,
	`uid` text NOT NULL,
	`source_memo_id` text NOT NULL,
	`target_memo_id` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memo_relations_relation_id_unique` ON `memo_relations` (`relation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memo_relations_relation_id` ON `memo_relations` (`relation_id`);--> statement-breakpoint
CREATE INDEX `idx_memo_relations_uid` ON `memo_relations` (`uid`);--> statement-breakpoint
CREATE INDEX `idx_memo_relations_source_memo_id` ON `memo_relations` (`source_memo_id`);--> statement-breakpoint
CREATE INDEX `idx_memo_relations_target_memo_id` ON `memo_relations` (`target_memo_id`);--> statement-breakpoint
CREATE TABLE `memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`memo_id` text NOT NULL,
	`uid` text NOT NULL,
	`category_id` text,
	`content` text NOT NULL,
	`type` text,
	`source` text,
	`attachments` text,
	`tag_ids` text,
	`tags` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memos_memo_id_unique` ON `memos` (`memo_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memos_memo_id` ON `memos` (`memo_id`);--> statement-breakpoint
CREATE INDEX `idx_memos_uid` ON `memos` (`uid`);--> statement-breakpoint
CREATE INDEX `idx_memos_category_id` ON `memos` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_memos_created_at` ON `memos` (`created_at`);--> statement-breakpoint
CREATE TABLE `_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_migrations_hash` ON `_migrations` (`hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`email` text,
	`phone` text,
	`password` text NOT NULL,
	`salt` text NOT NULL,
	`nickname` text,
	`avatar` text,
	`status` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_uid_unique` ON `users` (`uid`);--> statement-breakpoint
CREATE INDEX `idx_users_uid` ON `users` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);