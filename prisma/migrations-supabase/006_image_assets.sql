-- Incremental migration: store uploaded images in the database (serverless
-- hosts have no writable disk). Apply to databases created before this change.
CREATE TABLE "ImageAsset" (
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("name")
);
