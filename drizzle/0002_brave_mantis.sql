ALTER TABLE "users" DROP CONSTRAINT "users_uid_unique";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tendered_amount" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "currency" text DEFAULT 'UGX' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "tax_rate_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "receipt_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_pin_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_locked_until" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_restaurant_unique" ON "users" USING btree ("uid","restaurant_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key");