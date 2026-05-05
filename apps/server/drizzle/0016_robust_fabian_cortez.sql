CREATE TABLE `user_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`token_key` varchar(64) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`revoked_at` timestamp(3),
	CONSTRAINT `user_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_tokens_token_key_unique` UNIQUE(`token_key`)
);
