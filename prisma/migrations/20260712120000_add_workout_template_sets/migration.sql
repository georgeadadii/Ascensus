-- CreateTable
CREATE TABLE "WorkoutTemplateSet" (
    "id" TEXT NOT NULL,
    "templateExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "minReps" INTEGER NOT NULL,
    "maxReps" INTEGER NOT NULL,
    "targetWeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplateSet_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WorkoutSet"
ADD COLUMN "plannedMinReps" INTEGER,
ADD COLUMN "plannedMaxReps" INTEGER;

-- Migrate existing template prescription data into per-set rows.
INSERT INTO "WorkoutTemplateSet" (
    "id",
    "templateExerciseId",
    "setNumber",
    "minReps",
    "maxReps",
    "targetWeight",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || wte."id" || gs::text),
    wte."id",
    gs,
    CASE
        WHEN wte."targetReps" ~ '^\s*\d+\s*-\s*\d+\s*$'
            THEN split_part(regexp_replace(wte."targetReps", '\s+', '', 'g'), '-', 1)::INTEGER
        WHEN wte."targetReps" ~ '^\s*\d+\s*$'
            THEN trim(wte."targetReps")::INTEGER
        ELSE 1
    END,
    CASE
        WHEN wte."targetReps" ~ '^\s*\d+\s*-\s*\d+\s*$'
            THEN split_part(regexp_replace(wte."targetReps", '\s+', '', 'g'), '-', 2)::INTEGER
        WHEN wte."targetReps" ~ '^\s*\d+\s*$'
            THEN trim(wte."targetReps")::INTEGER
        ELSE 1
    END,
    wte."targetWeight",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WorkoutTemplateExercise" wte
CROSS JOIN LATERAL generate_series(1, GREATEST(COALESCE(wte."targetSets", 0), 0)) AS gs;

-- AlterTable
ALTER TABLE "WorkoutTemplateExercise"
DROP COLUMN "targetSets",
DROP COLUMN "targetReps",
DROP COLUMN "targetWeight";

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateSet_templateExerciseId_setNumber_key" ON "WorkoutTemplateSet"("templateExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "WorkoutTemplateSet_templateExerciseId_idx" ON "WorkoutTemplateSet"("templateExerciseId");

-- AddForeignKey
ALTER TABLE "WorkoutTemplateSet"
ADD CONSTRAINT "WorkoutTemplateSet_templateExerciseId_fkey"
FOREIGN KEY ("templateExerciseId") REFERENCES "WorkoutTemplateExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
