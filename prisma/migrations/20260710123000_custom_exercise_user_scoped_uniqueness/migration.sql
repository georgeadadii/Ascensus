/*
  Warnings:

  - The unique constraint on `[source,name]` for `Exercise` is being replaced
    so custom exercise names can be unique per user instead of globally.
*/
-- DropIndex
DROP INDEX "Exercise_source_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_source_name_userId_key" ON "Exercise"("source", "name", "userId");
