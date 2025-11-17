-- AlterTable
ALTER TABLE "games" ALTER COLUMN "initialAnagramLength" SET DEFAULT 5;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
