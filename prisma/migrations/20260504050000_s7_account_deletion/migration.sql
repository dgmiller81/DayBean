-- S7-T03 — Account deletion grace window.
-- pendingDeletionAt is non-null while the user is in the 24h cancel window.
-- The sweep cron deletes the User row when pendingDeletionAt < now and
-- cascades through every userId foreign key in the schema.
ALTER TABLE "User" ADD COLUMN "pendingDeletionAt" DATETIME;
