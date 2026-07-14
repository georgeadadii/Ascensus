-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "templateVersion" INTEGER;

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
