import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "authenticated";
}

// GET /api/admin/data?type=teachers|rooms|students|stats
export async function GET(req: NextRequest) {
  if (!checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  if (type === "stats") {
    const [teachers, rooms, students] = await Promise.all([
      prisma.teacher.count(),
      prisma.room.count(),
      prisma.student.count(),
    ]);
    return NextResponse.json({ teachers, rooms, students });
  }

  if (type === "teachers") {
    const data = await prisma.teacher.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { rooms: true } } },
    });
    return NextResponse.json(data);
  }

  if (type === "rooms") {
    const data = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { channelName: true, email: true } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(data);
  }

  if (type === "students") {
    const data = await prisma.student.findMany({
      orderBy: { joinedAt: "desc" },
      include: {
        room: { select: { name: true, token: true } },
      },
    });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// DELETE /api/admin/data?type=teacher|room|student&id=xxx
export async function DELETE(req: NextRequest) {
  if (!checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (type === "teacher") {
    // cascade delete rooms + students first
    const rooms = await prisma.room.findMany({ where: { teacherId: id } });
    for (const room of rooms) {
      await prisma.student.deleteMany({ where: { roomId: room.id } });
    }
    await prisma.room.deleteMany({ where: { teacherId: id } });
    await prisma.teacher.delete({ where: { id } });
  } else if (type === "room") {
    await prisma.student.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });
  } else if (type === "student") {
    await prisma.student.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}