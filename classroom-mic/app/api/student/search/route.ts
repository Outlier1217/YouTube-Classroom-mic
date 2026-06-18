import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rollNumber = searchParams.get("roll");
  const roomToken = searchParams.get("token");

  if (!rollNumber || !roomToken) {
    return NextResponse.json({ error: "roll and token required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { token: roomToken } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const student = await prisma.student.findFirst({
    where: { rollNumber, roomId: room.id },
  });

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  return NextResponse.json({ student });
}
