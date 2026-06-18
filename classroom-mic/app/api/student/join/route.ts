import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateRollNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `STU${num}`;
}

export async function POST(req: NextRequest) {
  const { token, name } = await req.json();

  if (!token || !name) {
    return NextResponse.json({ error: "Token and name required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { token } });
  if (!room) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const rollNumber = generateRollNumber();

  const student = await prisma.student.create({
    data: { name, rollNumber, roomId: room.id },
  });

  return NextResponse.json({ success: true, student, roomName: room.name });
}
