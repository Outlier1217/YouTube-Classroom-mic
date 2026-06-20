import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { teacherSockets, studentPeers } from "@/lib/liveStore";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}

export async function GET(_req: NextRequest) {
  if (!(await checkAuth()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Active room tokens (teachers connected)
  const activeTokens = Array.from(teacherSockets.keys());

  // Students grouped by roomToken
  const studentsByRoom = new Map<string, string[]>();
  studentPeers.forEach((data, rollNumber) => {
    const existing = studentsByRoom.get(data.roomToken) ?? [];
    studentsByRoom.set(data.roomToken, [...existing, rollNumber]);
  });

  // DB se room names fetch karo
  const rooms = activeTokens.length > 0
    ? await prisma.room.findMany({
        where: { token: { in: activeTokens } },
        include: { teacher: { select: { channelName: true } } },
      })
    : [];

  const liveSessions = rooms.map((room) => ({
    token: room.token,
    roomName: room.name,
    teacherChannel: room.teacher.channelName,
    connectedStudents: studentsByRoom.get(room.token) ?? [],
    studentCount: (studentsByRoom.get(room.token) ?? []).length,
  }));

  return NextResponse.json({
    activeSessions: liveSessions.length,
    totalConnectedStudents: studentPeers.size,
    sessions: liveSessions,
  });
}