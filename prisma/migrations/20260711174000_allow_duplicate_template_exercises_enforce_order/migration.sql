-- DropIndex
DROP INDEX "WorkoutTemplateExercise_templateId_exerciseId_key";

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateExercise_templateId_order_key" ON "WorkoutTemplateExercise"("templateId", "order");
