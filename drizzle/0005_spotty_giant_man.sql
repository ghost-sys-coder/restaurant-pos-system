ALTER TABLE "menu_items" ADD COLUMN "image_public_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_restaurant_name_unique" ON "categories" USING btree ("restaurant_id","name");