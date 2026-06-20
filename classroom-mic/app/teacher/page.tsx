"use client";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import TeacherDashboard from "./dashboard";

export default function TeacherPage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [channelName, setChannelName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading")
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (session) return <TeacherDashboard />;

  const handleRegister = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/teacher/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, channelName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Invalid email or password");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Top Ad */}
      <div className="w-full bg-[#111827] border-b border-[#1f2937] flex items-center justify-center py-2 min-h-[60px]">
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>

      <div className="flex flex-1">
        {/* Main */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Back link */}
            <a href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-6 transition">
              ← Back to home
            </a>

            <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8 flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold text-white">👨‍🏫 Teacher Portal</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {mode === "login" ? "Welcome back — login to your account" : "Create your teacher account"}
                </p>
              </div>

              {/* Tab toggle */}
              <div className="flex gap-1 bg-[#0d1117] rounded-xl p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(""); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize ${
                      mode === m ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-2.5">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <input
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address" type="email"
                  className="bg-[#0d1117] border border-[#1f2937] focus:border-blue-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none text-sm transition"
                />
                <input
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" type="password"
                  className="bg-[#0d1117] border border-[#1f2937] focus:border-blue-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none text-sm transition"
                />
                {mode === "register" && (
                  <input
                    value={channelName} onChange={(e) => setChannelName(e.target.value)}
                    placeholder="YouTube channel name (e.g. Outlier Lab)"
                    className="bg-[#0d1117] border border-[#1f2937] focus:border-blue-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none text-sm transition"
                  />
                )}
              </div>

              <button
                onClick={mode === "register" ? handleRegister : handleLogin}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Login"}
              </button>
            </div>

            {/* Info box */}
            <div className="mt-4 bg-[#111827] border border-[#1f2937] rounded-xl p-4">
              <p className="text-gray-500 text-xs leading-relaxed">
                <span className="text-gray-400 font-semibold">How it works:</span> Create a room → share the token with students → search their roll number during class → unmute to hear them.
              </p>
            </div>
          </div>
        </main>

        {/* Right sidebar ad */}
        <aside className="hidden lg:flex w-44 bg-[#111827] border-l border-[#1f2937] flex-col items-center justify-center gap-4 p-3">
          <p className="text-[#374151] text-[9px] font-mono uppercase tracking-wider">Sponsored</p>
          <div className="w-[120px] h-[240px] bg-[#1f2937] rounded-lg flex items-center justify-center">
            <span className="text-[#374151] text-[9px] font-mono text-center">Ad<br/>120×240</span>
          </div>
          <div className="w-[120px] h-[240px] bg-[#1f2937] rounded-lg flex items-center justify-center">
            <span className="text-[#374151] text-[9px] font-mono text-center">Ad<br/>120×240</span>
          </div>
        </aside>
      </div>
    </div>
  );
}