import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import prisma from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-32-characters-minimum!!',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
})