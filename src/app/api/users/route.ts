import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}

export async function POST(req: Request) {
  const { name, email } = await req.json()
  const user = await prisma.user.create({
    data: { name, email },
  })
  return Response.json(user)
}
