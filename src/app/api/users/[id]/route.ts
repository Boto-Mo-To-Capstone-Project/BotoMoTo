import { prisma } from '@/lib/prisma'

interface Params {
  params: { id: string }
}

export async function PUT(req: Request, { params }: Params) {
  const { name, email } = await req.json()
  const updated = await prisma.user.update({
    where: { id: Number(params.id) },
    data: { name, email },
  })
  return Response.json(updated)
}

export async function DELETE(_: Request, { params }: Params) {
  await prisma.user.delete({
    where: { id: Number(params.id) },
  })
  return Response.json({ success: true })
}
