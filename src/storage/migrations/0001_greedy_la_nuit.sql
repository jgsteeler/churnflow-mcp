ALTER TABLE `captures` ADD `tags` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `captures` ADD `context_tags` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `captures` ADD `keywords` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `captures` DROP COLUMN `json`;--> statement-breakpoint
ALTER TABLE `contexts` ADD `keywords` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `contexts` ADD `patterns` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `contexts` DROP COLUMN `json`;--> statement-breakpoint
ALTER TABLE `learning_patterns` ADD `input_keywords` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `learning_patterns` ADD `input_patterns` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `learning_patterns` DROP COLUMN `json`;