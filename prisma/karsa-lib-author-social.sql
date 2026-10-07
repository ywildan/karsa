-- Apply before deploying the author request social username fields.
ALTER TABLE "LibAuthorRequest" ADD COLUMN IF NOT EXISTS "instagram_username" TEXT;
ALTER TABLE "LibAuthorRequest" ADD COLUMN IF NOT EXISTS "tiktok_username" TEXT;
