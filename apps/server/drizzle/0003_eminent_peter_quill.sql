ALTER TABLE `categories` DROP FOREIGN KEY `categories_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `tags` DROP FOREIGN KEY `tags_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `memos` DROP FOREIGN KEY `memos_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `memos` DROP FOREIGN KEY `memos_category_id_categories_category_id_fk`;
--> statement-breakpoint
ALTER TABLE `memo_relations` DROP FOREIGN KEY `memo_relations_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `memo_relations` DROP FOREIGN KEY `memo_relations_source_memo_id_memos_memo_id_fk`;
--> statement-breakpoint
ALTER TABLE `memo_relations` DROP FOREIGN KEY `memo_relations_target_memo_id_memos_memo_id_fk`;
--> statement-breakpoint
ALTER TABLE `attachments` DROP FOREIGN KEY `attachments_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `ai_conversations` DROP FOREIGN KEY `ai_conversations_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `ai_messages` DROP FOREIGN KEY `ai_messages_conversation_id_ai_conversations_conversation_id_fk`;
--> statement-breakpoint
ALTER TABLE `daily_recommendations` DROP FOREIGN KEY `daily_recommendations_uid_users_uid_fk`;
--> statement-breakpoint
ALTER TABLE `push_rules` DROP FOREIGN KEY `push_rules_uid_users_uid_fk`;
