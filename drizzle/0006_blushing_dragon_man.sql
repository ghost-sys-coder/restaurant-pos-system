ALTER TABLE "orders" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_rate_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "orders"
SET "currency" = "restaurants"."currency",
    "tax_rate_bps" = "restaurants"."tax_rate_bps",
    "discount_rate_bps" = CASE
      WHEN "orders"."subtotal" > 0 THEN round(("orders"."discount"::numeric * 10000) / "orders"."subtotal")::integer
      ELSE 0
    END
FROM "restaurants"
WHERE "orders"."restaurant_id" = "restaurants"."id";--> statement-breakpoint
UPDATE "orders" SET "currency" = 'UGX' WHERE "currency" IS NULL;--> statement-breakpoint
UPDATE "orders" SET "tax_rate_bps" = 0 WHERE "tax_rate_bps" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'UGX';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "tax_rate_bps" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "tax_rate_bps" SET NOT NULL;
