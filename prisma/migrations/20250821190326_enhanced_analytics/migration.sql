-- Add images field to posts table if it doesn't exist
ALTER TABLE "posts" ADD COLUMN "images" TEXT;
