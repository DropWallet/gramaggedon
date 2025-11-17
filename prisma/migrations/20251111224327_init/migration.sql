-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'QUEUE_OPEN', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "consecutiveDaysPlayed" INTEGER NOT NULL DEFAULT 0,
    "longestConsecutiveDays" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedDate" TIMESTAMP(3),
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "averageRoundsCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "worldRank" INTEGER,
    "worldRankUpdatedAt" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_customizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatar" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "colorScheme" TEXT NOT NULL DEFAULT 'green',

    CONSTRAINT "user_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL DEFAULT 'MORNING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "queueOpensAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "maxRounds" INTEGER NOT NULL DEFAULT 10,
    "initialTimeSeconds" INTEGER NOT NULL DEFAULT 60,
    "timeDecreasePerRound" INTEGER NOT NULL DEFAULT 5,
    "initialAnagramLength" INTEGER NOT NULL DEFAULT 4,
    "lengthIncreasePerRound" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_anagrams" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "anagram" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "timeSeconds" INTEGER NOT NULL,
    "roundStartedAt" TIMESTAMP(3),
    "roundEndedAt" TIMESTAMP(3),

    CONSTRAINT "game_anagrams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_results" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "canBeClaimed" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "roundsCompleted" INTEGER NOT NULL DEFAULT 0,
    "finalRound" INTEGER,
    "totalTime" INTEGER,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "disconnectedAt" TIMESTAMP(3),
    "reconnectedAt" TIMESTAMP(3),
    "isDisconnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_results" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" TIMESTAMP(3),
    "finalCorrectAnswer" TEXT,
    "firstCorrectSubmissionAt" TIMESTAMP(3),
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "round_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_attempts" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "submittedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSinceRoundStart" INTEGER NOT NULL,

    CONSTRAINT "submission_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_queues" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "game_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_comparisons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "sharedGameIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "headToHeadWins" INTEGER NOT NULL DEFAULT 0,
    "headToHeadLosses" INTEGER NOT NULL DEFAULT 0,
    "headToHeadTies" INTEGER NOT NULL DEFAULT 0,
    "averageRoundsDifference" DOUBLE PRECISION,
    "winRateDifference" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_customizations_userId_key" ON "user_customizations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_anagrams_gameId_roundNumber_key" ON "game_anagrams"("gameId", "roundNumber");

-- CreateIndex
CREATE INDEX "game_results_sessionId_idx" ON "game_results"("sessionId");

-- CreateIndex
CREATE INDEX "game_results_expiresAt_idx" ON "game_results"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_gameId_userId_key" ON "game_results"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_gameId_sessionId_key" ON "game_results"("gameId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "round_results_gameResultId_roundNumber_key" ON "round_results"("gameResultId", "roundNumber");

-- CreateIndex
CREATE INDEX "submission_attempts_gameResultId_roundNumber_idx" ON "submission_attempts"("gameResultId", "roundNumber");

-- CreateIndex
CREATE INDEX "submission_attempts_roundNumber_submittedAt_idx" ON "submission_attempts"("roundNumber", "submittedAt");

-- CreateIndex
CREATE INDEX "submission_attempts_gameResultId_roundNumber_submittedAt_idx" ON "submission_attempts"("gameResultId", "roundNumber", "submittedAt");

-- CreateIndex
CREATE INDEX "game_queues_gameId_joinedAt_idx" ON "game_queues"("gameId", "joinedAt");

-- CreateIndex
CREATE INDEX "game_queues_sessionId_idx" ON "game_queues"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "game_queues_gameId_userId_key" ON "game_queues"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_queues_gameId_sessionId_key" ON "game_queues"("gameId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_userId_friendId_key" ON "friendships"("userId", "friendId");

-- CreateIndex
CREATE INDEX "friend_comparisons_userId_idx" ON "friend_comparisons"("userId");

-- CreateIndex
CREATE INDEX "friend_comparisons_friendId_idx" ON "friend_comparisons"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "friend_comparisons_userId_friendId_key" ON "friend_comparisons"("userId", "friendId");

-- AddForeignKey
ALTER TABLE "user_customizations" ADD CONSTRAINT "user_customizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_anagrams" ADD CONSTRAINT "game_anagrams_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "game_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attempts" ADD CONSTRAINT "submission_attempts_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "game_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_queues" ADD CONSTRAINT "game_queues_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_queues" ADD CONSTRAINT "game_queues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_comparisons" ADD CONSTRAINT "friend_comparisons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_comparisons" ADD CONSTRAINT "friend_comparisons_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
