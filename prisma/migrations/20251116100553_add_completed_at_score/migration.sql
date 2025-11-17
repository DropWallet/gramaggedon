-- AlterTable
ALTER TABLE "game_results" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
