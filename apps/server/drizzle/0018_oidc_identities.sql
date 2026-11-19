CREATE TABLE `oidc_identities` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`issuer` varchar(191) NOT NULL,
	`sub` varchar(191) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `oidc_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `oidc_identities_issuer_sub_uidx` UNIQUE(`issuer`,`sub`),
	CONSTRAINT `oidc_identities_user_issuer_uidx` UNIQUE(`user_id`,`issuer`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `salt` varchar(255);