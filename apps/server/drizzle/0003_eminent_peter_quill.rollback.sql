-- Rollback script for 0003_eminent_peter_quill.sql
-- Re-adds foreign key constraints that were dropped
-- Run this manually if you need to rollback the foreign key removal

ALTER TABLE `categories` ADD CONSTRAINT `categories_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `memos` ADD CONSTRAINT `memos_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `memos` ADD CONSTRAINT `memos_category_id_categories_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_source_memo_id_memos_memo_id_fk` FOREIGN KEY (`source_memo_id`) REFERENCES `memos`(`memo_id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `memo_relations` ADD CONSTRAINT `memo_relations_target_memo_id_memos_memo_id_fk` FOREIGN KEY (`target_memo_id`) REFERENCES `memos`(`memo_id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversation_id_ai_conversations_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`conversation_id`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `daily_recommendations` ADD CONSTRAINT `daily_recommendations_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `push_rules` ADD CONSTRAINT `push_rules_uid_users_uid_fk` FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON DELETE CASCADE;
