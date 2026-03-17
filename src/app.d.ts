import type { Session, User } from "@prisma/client"

declare global {
  namespace App {
    interface Locals {
      session: Session | null
      user: User | null
    }
  }
}

export {}