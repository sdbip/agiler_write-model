-- -------------------------------------------------------------
-- TablePlus 5.1.0(468)
--
-- https://tableplus.com/
--
-- Database: agiler
-- Generation Time: 2022-12-08 07:44:05.0940
-- -------------------------------------------------------------


-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Table Definition
CREATE TABLE "public"."events" (
    "entity_id" text NOT NULL,
    "entity_type" text NOT NULL,
    "name" text NOT NULL,
    "details" text NOT NULL,
    "actor" text NOT NULL,
    "timestamp" numeric(12,7) NOT NULL DEFAULT (EXTRACT(epoch FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text)) / (86400)::numeric),
    "version" int4 NOT NULL,
    "position" int8 NOT NULL,
    CONSTRAINT "events_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id")
);

