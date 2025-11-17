-- AlterTable
ALTER TABLE "games" ADD COLUMN     "roundTimeSeconds" INTEGER NOT NULL DEFAULT 150;

-- CreateTable
CREATE TABLE "game_rounds" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "timeSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "game_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_words" (
    "id" TEXT NOT NULL,
    "gameRoundId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "anagram" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "round_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_rounds_gameId_roundNumber_key" ON "game_rounds"("gameId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "round_words_gameRoundId_index_key" ON "round_words"("gameRoundId", "index");

-- AddForeignKey
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_words" ADD CONSTRAINT "round_words_gameRoundId_fkey" FOREIGN KEY ("gameRoundId") REFERENCES "game_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
