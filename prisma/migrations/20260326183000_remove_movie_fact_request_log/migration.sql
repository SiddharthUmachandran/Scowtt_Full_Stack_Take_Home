-- Keep migration history consistent across environments.
-- This migration removes the legacy request-log table when present.
DROP TABLE IF EXISTS "MovieFactRequestLog";
