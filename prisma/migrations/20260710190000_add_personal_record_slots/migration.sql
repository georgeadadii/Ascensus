-- CreateTable
CREATE TABLE "PersonalRecordSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalRecordSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecordSlot_userId_slot_key" ON "PersonalRecordSlot"("userId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecordSlot_userId_exerciseId_key" ON "PersonalRecordSlot"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "PersonalRecordSlot_userId_slot_idx" ON "PersonalRecordSlot"("userId", "slot");

-- CreateIndex
CREATE INDEX "PersonalRecordSlot_exerciseId_idx" ON "PersonalRecordSlot"("exerciseId");

-- AddForeignKey
ALTER TABLE "PersonalRecordSlot" ADD CONSTRAINT "PersonalRecordSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecordSlot" ADD CONSTRAINT "PersonalRecordSlot_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
