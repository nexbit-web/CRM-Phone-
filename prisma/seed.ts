import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import 'dotenv/config'

// npx prisma db seed

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
})

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: 'admin' },
  })

  if (existing) {
    console.log('✅ Владелец уже существует:', existing.email)
    return
  }

  await auth.api.createUser({
    body: {
      name: 'ппп',
      email: 'nik@crm.com',
      password: '123456',
      role: 'admin',
    },
  })

  console.log('✅ Владелец создан!')
  console.log('   Email:  owner@crm.com')
  console.log('   Пароль: password123')
  console.log('⚠️  Смени пароль в /admin!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
