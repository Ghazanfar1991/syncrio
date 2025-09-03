// NextAuth.js API route
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
// Ensure Prisma works in serverless on Vercel
export const runtime = 'nodejs'
