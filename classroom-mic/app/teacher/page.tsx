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

  if (status === "loading") return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white text-center">👨‍🏫 Teacher Portal</h2>
        <div className="flex gap-2">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg font-semibold transition ${mode === "login" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>Login</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 rounded-lg font-semibold transition ${mode === "register" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>Register</button>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none" />
        {mode === "register" && (
          <input value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="Channel Name (unique)" className="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none" />
        )}
        <button
          onClick={mode === "register" ? handleRegister : handleLogin}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "register" ? "Register" : "Login"}
        </button>
      </div>
    </main>
  );
}
