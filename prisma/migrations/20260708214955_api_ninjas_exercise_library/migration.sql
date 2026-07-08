/*
  Warnings:

  - You are about to drop the column `muscleGroup` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Exercise` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[source,name]` on the table `Exercise` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('SEEDED', 'API_NINJAS', 'CUSTOM');

-- DropIndex
DROP INDEX "Exercise_name_key";

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "muscleGroup",
DROP COLUMN "notes",
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryMuscle" TEXT,
ADD COLUMN     "source" "ExerciseSource" NOT NULL DEFAULT 'SEEDED',
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN     "isDropSet" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Exercise_name_idx" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");

-- CreateIndex
CREATE INDEX "Exercise_primaryMuscle_idx" ON "Exercise"("primaryMuscle");

-- CreateIndex
CREATE INDEX "Exercise_equipment_idx" ON "Exercise"("equipment");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_source_name_key" ON "Exercise"("source", "name");
