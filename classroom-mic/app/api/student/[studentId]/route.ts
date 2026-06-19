import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { email: session.user.email } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { room: true } });
  if (!student || student.room.teacherId !== teacher.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await prisma.student.delete({ where: { id: studentId } });
  return NextResponse.json({ success: true });
}
