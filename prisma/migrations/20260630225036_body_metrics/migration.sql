-- CreateTable
CREATE TABLE "UserBaseline" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "initialWeight" DOUBLE PRECISION NOT NULL,
    "initialBodyFat" DOUBLE PRECISION,
    "height" DOUBLE PRECISION NOT NULL,
    "targetWeight" DOUBLE PRECISION,
    "activityLevel" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "UserBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "leanMass" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "ffmi" DOUBLE PRECISION,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBaseline_user_id_key" ON "UserBaseline"("user_id");

-- CreateIndex
CREATE INDEX "BodyMetric_user_id_date_idx" ON "BodyMetric"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BodyMetric_user_id_date_key" ON "BodyMetric"("user_id", "date");

-- AddForeignKey
ALTER TABLE "UserBaseline" ADD CONSTRAINT "UserBaseline_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMetric" ADD CONSTRAINT "BodyMetric_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

