"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Top Ad Banner */}
      <div className="w-full bg-[#111827] border-b border-[#1f2937] flex items-center justify-center py-2 min-h-[60px]">
        {/* Replace with actual AdSense code */}
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>

      {/* Main content + side ad */}
      <div className="flex flex-1">
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🎙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Classroom Mic</h1>
              <p className="text-sm text-gray-500 mt-0.5">by Outlier Lab</p>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-gray-400 text-center max-w-sm text-sm leading-relaxed">
            Real-time mic control for YouTube live classes.<br />
            Students speak directly to teachers — no interruptions.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={() => router.push("/teacher")}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-base font-semibold rounded-xl transition-all duration-150 shadow-md"
            >
              <span className="text-xl">👨‍🏫</span> I'm a Teacher
            </button>
            <button
              onClick={() => router.push("/student")}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-base font-semibold rounded-xl transition-all duration-150 shadow-md"
            >
              <span className="text-xl">🎓</span> I'm a Student
            </button>
          </div>

          {/* How it works — 3 steps */}
          <div className="mt-4 grid grid-cols-3 gap-4 max-w-lg w-full">
            {[
              { icon: "📢", title: "Teacher shares token", desc: "Create a room and share the token with your class" },
              { icon: "💬", title: "Student posts roll no.", desc: "Student pastes roll number in YouTube live chat" },
              { icon: "🎙️", title: "Teacher unmutes", desc: "One click — student's voice comes through live" },
            ].map((s) => (
              <div key={s.title} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-white text-xs font-semibold mb-1">{s.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </main>

        {/* Right sidebar ad — visible on md+ */}
        <aside className="hidden md:flex w-40 bg-[#111827] border-l border-[#1f2937] flex-col items-center justify-center gap-4 p-3">
          <p className="text-[#374151] text-[9px] font-mono uppercase tracking-wider">Sponsored</p>
          {/* Replace with actual AdSense units */}
          <div className="w-[120px] h-[240px] bg-[#1f2937] rounded-lg flex items-center justify-center">
            <span className="text-[#374151] text-[9px] font-mono text-center">Ad<br/>120×240</span>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-[#111827] border-t border-[#1f2937] py-3 px-6 flex items-center justify-between">
        <p className="text-gray-600 text-xs">© 2025 Outlier Lab</p>
        <a href="https://youtube.com/@Outlier-lab" target="_blank" rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-400 text-xs transition">
          YouTube →
        </a>
      </footer>
    </div>
  );
}