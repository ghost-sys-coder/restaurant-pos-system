-- Upgrade the existing restaurant POS schema with terminal and PIN access.
-- Existing Clerk staff records remain valid and are attached to a restaurant
-- and location when the first terminal is enrolled.

CREATE TABLE "restaurants" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL REFERENCES "restaurants"("id"),
  "name" text NOT NULL,
  "timezone" text DEFAULT 'Africa/Kampala' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "locations_restaurant_name_unique" ON "locations" ("restaurant_id", "name");
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uid" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "restaurant_id" integer REFERENCES "restaurants"("id");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location_id" integer REFERENCES "locations"("id");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX "users_restaurant_location_idx" ON "users" ("restaurant_id", "location_id");
--> statement-breakpoint
CREATE TABLE "terminals" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL REFERENCES "restaurants"("id"),
  "location_id" integer NOT NULL REFERENCES "locations"("id"),
  "name" text NOT NULL,
  "type" text DEFAULT 'register' NOT NULL,
  "credential_hash" text NOT NULL,
  "enrolled_by_staff_id" integer REFERENCES "users"("id"),
  "is_active" boolean DEFAULT true NOT NULL,
  "inactivity_timeout_minutes" integer DEFAULT 15 NOT NULL,
  "failed_pin_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "terminals_location_name_unique" ON "terminals" ("location_id", "name");
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "terminal_id" integer NOT NULL REFERENCES "terminals"("id"),
  "staff_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "staff_sessions_terminal_idx" ON "staff_sessions" ("terminal_id");
--> statement-breakpoint
CREATE INDEX "staff_sessions_staff_idx" ON "staff_sessions" ("staff_id");
--> statement-breakpoint
CREATE TABLE "audit_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL REFERENCES "restaurants"("id"),
  "location_id" integer NOT NULL REFERENCES "locations"("id"),
  "terminal_id" integer REFERENCES "terminals"("id"),
  "actor_staff_id" integer REFERENCES "users"("id"),
  "approver_staff_id" integer REFERENCES "users"("id"),
  "action" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_restaurant_created_idx" ON "audit_events" ("restaurant_id", "created_at");
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "created_by_staff_id" integer REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "processed_by_staff_id" integer REFERENCES "users"("id");
