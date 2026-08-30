CREATE TABLE "manager_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"terminal_id" integer NOT NULL,
	"requester_staff_id" integer NOT NULL,
	"approver_staff_id" integer NOT NULL,
	"action" text NOT NULL,
	"entity_id" text,
	"reason" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manager_approvals_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "manager_approvals" ADD CONSTRAINT "manager_approvals_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_approvals" ADD CONSTRAINT "manager_approvals_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_approvals" ADD CONSTRAINT "manager_approvals_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_approvals" ADD CONSTRAINT "manager_approvals_requester_staff_id_users_id_fk" FOREIGN KEY ("requester_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_approvals" ADD CONSTRAINT "manager_approvals_approver_staff_id_users_id_fk" FOREIGN KEY ("approver_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manager_approvals_scope_idx" ON "manager_approvals" USING btree ("location_id","action","created_at");