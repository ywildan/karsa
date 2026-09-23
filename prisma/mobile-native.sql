-- Migrasi tambahan untuk API SiKarsa Mobile native.
-- Aman dijalankan pada database yang sudah berisi data Karsa.

ALTER TABLE "PoinLog" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PoinLog_idempotency_key_key"
    ON "PoinLog" ("idempotency_key");

CREATE TABLE IF NOT EXISTS "MobileAuthRequest" (
    "id"             TEXT         NOT NULL,
    "state"          TEXT         NOT NULL,
    "code_challenge" TEXT         NOT NULL,
    "redirect_uri"   TEXT         NOT NULL,
    "user_id"        TEXT,
    "code_hash"      TEXT,
    "expires_at"     TIMESTAMP(3) NOT NULL,
    "consumed_at"    TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileAuthRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MobileSession" (
    "id"                 TEXT         NOT NULL,
    "user_id"            TEXT         NOT NULL,
    "access_token_hash"  TEXT         NOT NULL,
    "refresh_token_hash" TEXT         NOT NULL,
    "access_expires_at"  TIMESTAMP(3) NOT NULL,
    "refresh_expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at"         TIMESTAMP(3),
    "last_used_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_name"        TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MobileAuthRequest_code_hash_key"
    ON "MobileAuthRequest" ("code_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "MobileSession_access_token_hash_key"
    ON "MobileSession" ("access_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "MobileSession_refresh_token_hash_key"
    ON "MobileSession" ("refresh_token_hash");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MobileAuthRequest_user_id_fkey') THEN
        ALTER TABLE "MobileAuthRequest"
            ADD CONSTRAINT "MobileAuthRequest_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MobileSession_user_id_fkey') THEN
        ALTER TABLE "MobileSession"
            ADD CONSTRAINT "MobileSession_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MobileAuthRequest_expires_at_idx"
    ON "MobileAuthRequest" ("expires_at");
CREATE INDEX IF NOT EXISTS "MobileAuthRequest_user_id_idx"
    ON "MobileAuthRequest" ("user_id");
CREATE INDEX IF NOT EXISTS "MobileSession_user_id_revoked_at_idx"
    ON "MobileSession" ("user_id", "revoked_at");
CREATE INDEX IF NOT EXISTS "MobileSession_refresh_expires_at_idx"
    ON "MobileSession" ("refresh_expires_at");
