import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { email: session.user.email } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.teacherId !== teacher.id) return NextResponse.json({ error: "Not your room" }, { status: 403 });

  await prisma.student.deleteMany({ where: { roomId } });
  await prisma.room.delete({ where: { id: roomId } });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const { name } = await req.json();

  const teacher = await prisma.teacher.findUnique({ where: { email: session.user.email } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.teacherId !== teacher.id) return NextResponse.json({ error: "Not your room" }, { status: 403 });

  const updated = await prisma.room.update({ where: { id: roomId }, data: { name } });
  return NextResponse.json({ success: true, room: updated });
}
