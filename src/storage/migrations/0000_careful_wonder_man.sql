CREATE TABLE `capture_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`capture_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`added_reason` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text,
	FOREIGN KEY (`capture_id`) REFERENCES `captures`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`raw_input` text,
	`capture_type` text DEFAULT 'action' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'inbox' NOT NULL,
	`context_id` text,
	`confidence` real,
	`ai_reasoning` text,
	`tags` text DEFAULT '[]',
	`context_tags` text DEFAULT '[]',
	`keywords` text DEFAULT '[]',
	`start_date` text,
	`due_date` text,
	`completed_at` text,
	`last_reviewed_at` text,
	`review_score` real,
	`review_notes` text,
	`capture_source` text DEFAULT 'manual',
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`context_id`) REFERENCES `contexts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`color` text,
	`icon` text,
	`is_archive` integer DEFAULT false,
	`context_id` text,
	`is_premium` integer DEFAULT true,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`context_id`) REFERENCES `contexts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_name_unique` ON `collections` (`name`);--> statement-breakpoint
CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`category` text DEFAULT 'general',
	`description` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`color` text,
	`keywords` text DEFAULT '[]',
	`patterns` text DEFAULT '[]',
	`active` integer DEFAULT true,
	`priority` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contexts_name_unique` ON `contexts` (`name`);--> statement-breakpoint
CREATE TABLE `learning_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`input_keywords` text DEFAULT '[]',
	`input_length` integer,
	`input_patterns` text DEFAULT '[]',
	`chosen_context_id` text,
	`chosen_type` text NOT NULL,
	`original_confidence` real NOT NULL,
	`was_correct` integer,
	`user_corrected_context_id` text,
	`user_corrected_type` text,
	`weight` real DEFAULT 1,
	`created_at` text,
	FOREIGN KEY (`chosen_context_id`) REFERENCES `contexts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_corrected_context_id`) REFERENCES `contexts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`type` text DEFAULT 'string',
	`category` text DEFAULT 'general',
	`description` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preferences_key_unique` ON `preferences` (`key`);