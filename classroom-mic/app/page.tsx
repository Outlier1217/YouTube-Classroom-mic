"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-white">YouTube Classroom</h1>
      <p className="text-gray-400 text-lg">Who are you?</p>
      <div className="flex gap-6">
        <button
          onClick={() => router.push("/teacher")}
          className="px-10 py-6 bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold rounded-2xl transition"
        >
          👨‍🏫 Teacher
        </button>
        <button
          onClick={() => router.push("/student")}
          className="px-10 py-6 bg-green-600 hover:bg-green-700 text-white text-xl font-semibold rounded-2xl transition"
        >
          🎓 Student
        </button>
      </div>
    </main>
  );
}
