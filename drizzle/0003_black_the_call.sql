CREATE TABLE `llm_citations` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`engine` text NOT NULL,
	`attribution_type` text NOT NULL,
	`target_match` text NOT NULL,
	`llm_response_text` text,
	`mentioned_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `llm_tracked_queries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llm_query_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llm_tracked_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`query_set_id` text NOT NULL,
	`query_text` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`query_set_id`) REFERENCES `llm_query_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
