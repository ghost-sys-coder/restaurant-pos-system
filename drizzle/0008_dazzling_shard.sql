CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"unit" text NOT NULL,
	"on_hand_milliunits" integer DEFAULT 0 NOT NULL,
	"reorder_level_milliunits" integer DEFAULT 0 NOT NULL,
	"cost_per_unit" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity_milliunits" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"delta_milliunits" integer NOT NULL,
	"movement_type" text NOT NULL,
	"reason" text,
	"source_key" text NOT NULL,
	"actor_staff_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_recipes" ADD CONSTRAINT "menu_item_recipes_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_recipes" ADD CONSTRAINT "menu_item_recipes_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_staff_id_users_id_fk" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_location_name_unique" ON "inventory_items" USING btree ("location_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_location_sku_unique" ON "inventory_items" USING btree ("location_id","sku");--> statement-breakpoint
CREATE INDEX "inventory_items_restaurant_location_idx" ON "inventory_items" USING btree ("restaurant_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_recipes_item_stock_unique" ON "menu_item_recipes" USING btree ("menu_item_id","inventory_item_id");--> statement-breakpoint
CREATE INDEX "stock_movements_location_created_idx" ON "stock_movements" USING btree ("location_id","created_at");