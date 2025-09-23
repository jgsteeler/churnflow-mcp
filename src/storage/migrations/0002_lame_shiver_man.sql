DROP TABLE `capture_collections`;--> statement-breakpoint
DROP TABLE `collections`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_captures` (
	`id` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`raw_input` text,
	`capture_type` text,
	`priority` text,
	`status` text DEFAULT 'active',
	`context_id` text,
	`confidence` real,
	`ai_reasoning` text,
	`tags` text DEFAULT '[]',
	`keywords` text DEFAULT '[]',
	`reminder_date` text,
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
INSERT INTO `__new_captures`("id", "item", "raw_input", "capture_type", "priority", "status", "context_id", "confidence", "ai_reasoning", "tags", "keywords", "reminder_date", "due_date", "completed_at", "last_reviewed_at", "review_score", "review_notes", "capture_source", "created_at", "updated_at") SELECT "id", "text", "raw_input", "capture_type", "priority", "status", "context_id", "confidence", "ai_reasoning", "tags", "keywords", "start_date", "due_date", "completed_at", "last_reviewed_at", "review_score", "review_notes", "capture_source", "created_at", "updated_at" FROM `captures`;--> statement-breakpoint
DROP TABLE `captures`;--> statement-breakpoint
ALTER TABLE `__new_captures` RENAME TO `captures`;--> statement-breakpoint
PRAGMA foreign_keys=ON;