-- CreateEnum
CREATE TYPE "SleepSource" AS ENUM ('MANUAL', 'APPLE_HEALTH', 'HEALTH_CONNECT');

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bedTime" TIMESTAMP(3) NOT NULL,
    "sleepTime" TIMESTAMP(3),
    "wakeTime" TIMESTAMP(3) NOT NULL,
    "outOfBedTime" TIMESTAMP(3),
    "timeInBedMinutes" INTEGER NOT NULL,
    "timeAsleepMinutes" INTEGER NOT NULL,
    "sleepLatencyMinutes" INTEGER,
    "awakeMinutes" INTEGER,
    "sleepEfficiency" DOUBLE PRECISION,
    "qualityScore" INTEGER,
    "restednessScore" INTEGER,
    "awakenings" INTEGER,
    "notes" TEXT,
    "source" "SleepSource" NOT NULL DEFAULT 'MANUAL',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SleepLog_user_id_date_idx" ON "SleepLog"("user_id", "date");

-- CreateIndex
CREATE INDEX "SleepLog_user_id_wakeTime_idx" ON "SleepLog"("user_id", "wakeTime");

-- CreateIndex
CREATE UNIQUE INDEX "SleepLog_user_id_date_key" ON "SleepLog"("user_id", "date");

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
