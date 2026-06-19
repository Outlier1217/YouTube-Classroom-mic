import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateRollNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `STU${num}`;
}

export async function POST(req: NextRequest) {
  const { token, name, browserId } = await req.json();

  if (!token || !name || !browserId) {
    return NextResponse.json({ error: "Token, name and browserId required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { token } });
  if (!room) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  // Check if this browser already joined this room
  const existing = await prisma.student.findFirst({
    where: { roomId: room.id, browserId },
  });

  if (existing) {
    return NextResponse.json({ 
      success: true, 
      student: existing, 
      roomName: room.name,
      alreadyJoined: true 
    });
  }

  const rollNumber = generateRollNumber();

  const student = await prisma.student.create({
    data: { name, rollNumber, roomId: room.id, browserId },
  });

  return NextResponse.json({ success: true, student, roomName: room.name });
}
