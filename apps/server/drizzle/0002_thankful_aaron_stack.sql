ALTER TABLE `users` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `memos` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `memo_relations` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attachments` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_messages` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_recommendations` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `push_rules` ADD `deleted_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `categories` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `tags` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `memos` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `memo_relations` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `attachments` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `ai_conversations` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `ai_messages` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `daily_recommendations` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `push_rules` (`deleted_at`);