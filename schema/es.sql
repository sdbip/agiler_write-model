CREATE TABLE IF NOT EXISTS "public"."entities" (
  "id" text NOT NULL,
  "type" text NOT NULL,
  "version" int4 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."events" (
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
