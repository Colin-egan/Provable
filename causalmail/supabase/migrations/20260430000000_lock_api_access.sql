-- Revoke all Data API access from public/anon roles.
-- All data access goes through Prisma (direct DB connection), never the REST API.
REVOKE ALL ON public."User"        FROM anon, authenticated;
REVOKE ALL ON public."Study"       FROM anon, authenticated;
REVOKE ALL ON public."Customer"    FROM anon, authenticated;
REVOKE ALL ON public."StudyResult" FROM anon, authenticated;

-- Enable RLS on all tables as defense in depth.
-- No policies are needed since no API roles have grants.
ALTER TABLE public."User"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Study"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudyResult" ENABLE ROW LEVEL SECURITY;
