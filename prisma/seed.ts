// import 'dotenv/config'
// import { PrismaClient } from '../src/generated/prisma/client'
// import { PrismaPg } from '@prisma/adapter-pg'
// import { betterAuth } from 'better-auth'
// import { prismaAdapter } from 'better-auth/adapters/prisma'
// import { admin } from 'better-auth/plugins'
// import 'dotenv/config'

// npx prisma db seed

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
// })

// const prisma = new PrismaClient({ adapter })

// const auth = betterAuth({
//   database: prismaAdapter(prisma, {
//     provider: 'postgresql',
//   }),
//   emailAndPassword: {
//     enabled: true,
//   },
//   plugins: [admin()],
// })

// async function main() {
//   const existing = await prisma.user.findFirst({
//     where: { role: 'admin' },
//   })

//   if (existing) {
//     console.log('✅ Владелец уже существует:', existing.email)
//     return
//   }

//   await auth.api.createUser({
//     body: {
//       name: 'Микита',

//       email: 'nik@crm.com',
//       password: 'qwertyuiop2000',
//       role: 'admin',
//     },
//   })
//   // await auth.api.createUser({
//   //   body: {
//   //     name: 'Микита',
//   //     email: 'nik@crm.com',
//   //     password: 'qwertyuiop2000',
//   //     role: 'admin',
//   //   },
//   // })
//   // v9K#xP2!mQ7@Lr4

//   console.log('✅ Владелец создан!')
//   console.log('   Email:  owner@crm.com')
//   console.log('   Пароль: password123')
//   console.log('⚠️  Смени пароль в /admin!')
// }

// main()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect())

import 'dotenv/config'
import { PrismaClient, CleaningType } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const services: { name: string; type: CleaningType }[] = [
    { name: 'Підтримуюча прибирання', type: CleaningType.REGULAR },
    { name: 'Генеральна прибирання', type: CleaningType.GENERAL },
    { name: 'Після ремонту', type: CleaningType.AFTER_REPAIR },
    { name: 'Офісна прибирання', type: CleaningType.OFFICE },
    { name: 'Глибоке прибирання', type: CleaningType.DEEP_CLEAN },
    { name: 'Хімчистка', type: CleaningType.CARPET },
    { name: 'Миття вікон', type: CleaningType.WINDOW },
    { name: 'Інше', type: CleaningType.OTHER },
  ]

  for (const s of services) {
    await prisma.cleaningService.upsert({
      where: { name: s.name },
      update: {},
      create: { ...s, basePrice: 0, isActive: true },
    })
  }
  console.log('✅ CleaningService засіяно')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
