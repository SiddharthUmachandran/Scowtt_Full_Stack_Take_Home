-- Remove DB-backed request log table now that rate limiting is removed.
DROP TABLE IF EXISTS "MovieFactRequestLog";
