CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" text NOT NULL,
    "type" text NOT NULL,
    "progress" text NOT NULL,
    "title" text NOT NULL,
    "parent_id" text,
    PRIMARY KEY ("id")
);
