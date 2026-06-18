import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password, channelName } = await req.json();

  if (!email || !password || !channelName) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await prisma.teacher.findFirst({
    where: { OR: [{ email }, { channelName }] },
  });

  if (existing) {
    return NextResponse.json({ error: "Email or channel name already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const teacher = await prisma.teacher.create({
    data: { email, password: hashed, channelName },
  });

  return NextResponse.json({ success: true, teacherId: teacher.id });
}
