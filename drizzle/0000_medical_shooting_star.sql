CREATE TYPE "public"."account_type" AS ENUM('cash_bank', 'investment', 'bank_loan', 'credit_card', 'friend_debt_owed_to_me', 'friend_debt_i_owe');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."due_status" AS ENUM('pending', 'paid', 'skipped', 'carried');--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('emi', 'bill', 'income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."txn_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."txn_kind" AS ENUM('normal', 'adjustment', 'debt_origination', 'transfer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"balance_paise" bigint DEFAULT 0 NOT NULL,
	"invested_paise" bigint DEFAULT 0 NOT NULL,
	"interest_rate_bps" integer,
	"emi_paise" bigint,
	"tenure_months_left" integer,
	"counterparty" text,
	"valuation_updated_at" timestamp,
	"is_primary" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"month" text NOT NULL,
	"account_id" integer,
	"amount_paise" bigint NOT NULL,
	"due_date" date NOT NULL,
	"status" "due_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"origin_due_id" integer,
	"principal_paise" bigint,
	"interest_paise" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"name" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"amount_is_estimate" boolean DEFAULT false NOT NULL,
	"day_of_month" integer NOT NULL,
	"kind" "template_kind" NOT NULL,
	"category_id" integer,
	"start_month" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"net_worth_paise" bigint NOT NULL,
	"total_assets_paise" bigint NOT NULL,
	"total_liabilities_paise" bigint NOT NULL,
	"invested_paise" bigint NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"target_account_id" integer,
	"amount_paise" bigint NOT NULL,
	"direction" "txn_direction" NOT NULL,
	"kind" "txn_kind" DEFAULT 'normal' NOT NULL,
	"category_id" integer,
	"due_id" integer,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"value_paise" bigint NOT NULL,
	"as_of" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dues" ADD CONSTRAINT "dues_template_id_recurring_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues" ADD CONSTRAINT "dues_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dues_template_month_gen_key" ON "dues" USING btree ("template_id","month") WHERE origin_due_id IS NULL;