-- AlterTable
ALTER TABLE "game_queues" ALTER COLUMN "gameId" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "game_queues_gameId_userId_key";
DROP INDEX IF EXISTS "game_queues_gameId_sessionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "game_queues_userId_gameId_key" ON "game_queues"("userId", "gameId");
CREATE UNIQUE INDEX "game_queues_sessionId_gameId_key" ON "game_queues"("sessionId", "gameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_queues_userId_gameId_idx" ON "game_queues"("userId", "gameId");
