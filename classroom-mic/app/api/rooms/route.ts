import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Room name required" }, { status: 400 });

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const room = await prisma.room.create({
    data: { name, teacherId: teacher.id },
  });

  return NextResponse.json({ success: true, room });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email },
    include: { rooms: { include: { students: true } } },
  });

  return NextResponse.json({ rooms: teacher?.rooms ?? [] });
}
