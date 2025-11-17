import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma Client for Supabase connection pooling
// Transaction pooler (port 6543) doesn't support prepared statements
// Add ?pgbouncer=true to your DATABASE_URL in Vercel to disable prepared statements
const prismaClientOptions: any = {}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

