ALTER TABLE "menu_items" ADD COLUMN "kitchen_station" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "kitchen_station" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "course" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fired_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "ready_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "served_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "voided_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "void_reason" text;