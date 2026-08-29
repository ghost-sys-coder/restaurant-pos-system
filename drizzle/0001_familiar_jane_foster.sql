ALTER TABLE "restaurant_tables" DROP CONSTRAINT "restaurant_tables_table_number_unique";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "restaurant_id" integer;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "restaurant_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "restaurant_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "clerk_organization_id" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "created_by_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_tables_location_number_unique" ON "restaurant_tables" USING btree ("location_id","table_number");--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_clerk_organization_id_unique" UNIQUE("clerk_organization_id");--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_slug_unique" UNIQUE("slug");
--> statement-breakpoint
UPDATE "users" SET "role" = CASE "role"
  WHEN 'admin' THEN 'restaurant_owner'
  WHEN 'manager' THEN 'general_manager'
  WHEN 'waiter' THEN 'server'
  ELSE "role"
END;
--> statement-breakpoint
UPDATE "categories" SET "restaurant_id" = (SELECT "id" FROM "restaurants" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "restaurant_id" = (SELECT "id" FROM "restaurants" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
--> statement-breakpoint
UPDATE "orders" SET "restaurant_id" = (SELECT "id" FROM "restaurants" ORDER BY "id" LIMIT 1), "location_id" = (SELECT "id" FROM "locations" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
--> statement-breakpoint
UPDATE "restaurant_tables" SET "location_id" = (SELECT "id" FROM "locations" ORDER BY "id" LIMIT 1) WHERE "location_id" IS NULL;
