ALTER TABLE "categories" ALTER COLUMN "restaurant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "restaurant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "restaurant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
UPDATE "users"
SET "restaurant_id" = COALESCE("restaurant_id", (SELECT "id" FROM "restaurants" ORDER BY "id" LIMIT 1));--> statement-breakpoint
UPDATE "users"
SET "location_id" = COALESCE("location_id", (SELECT "id" FROM "locations" WHERE "restaurant_id" = "users"."restaurant_id" ORDER BY "id" LIMIT 1));--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "restaurant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "location_id" SET NOT NULL;
