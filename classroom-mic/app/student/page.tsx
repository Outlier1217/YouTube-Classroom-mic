"use client";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

function getBrowserId(): string {
  let id = localStorage.getItem("classroom_browser_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("classroom_browser_id", id); }
  return id;
}

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const el = document.createElement("textarea");
  el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
  document.body.appendChild(el); el.focus(); el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve(ok);
}

export default function StudentPage() {
  const [step, setStep] = useState<"enter" | "joined">("enter");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<{
    id: string; name: string; rollNumber: string; roomName: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("classroom_student");
    if (saved) {
      const parsed = JSON.parse(saved);
      setStudentData(parsed.studentData);
      setToken(parsed.token);
      setStep("joined");
    }
  }, []);

  const join = async () => {
    if (!token.trim() || !name.trim()) { setError("Token and name both required"); return; }
    setLoading(true); setError("");
    const browserId = getBrowserId();
    const res = await fetch("/api/student/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, browserId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    const sd = { id: data.student.id, name: data.student.name, rollNumber: data.student.rollNumber, roomName: data.roomName };
    setStudentData(sd);
    localStorage.setItem("classroom_student", JSON.stringify({ studentData: sd, token }));
    setStep("joined");
    setLoading(false);
  };

  if (step === "joined" && studentData) {
    return <StudentMicView studentData={studentData} token={token} />;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Top Ad */}
      <div className="w-full bg-[#111827] border-b border-[#1f2937] flex items-center justify-center py-2 min-h-[60px]">
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <a href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-6 transition">
            ← Back to home
          </a>

          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-white">🎓 Join Class</h2>
              <p className="text-gray-500 text-sm mt-1">Paste the token shared by your teacher</p>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                value={token} onChange={(e) => setToken(e.target.value)}
                placeholder="Class token (e.g. abc123xyz)"
                className="bg-[#0d1117] border border-[#1f2937] focus:border-emerald-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none text-sm transition font-mono"
              />
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="Your full name"
                className="bg-[#0d1117] border border-[#1f2937] focus:border-emerald-600 text-white placeholder-gray-600 px-4 py-3 rounded-xl outline-none text-sm transition"
              />
            </div>

            <button
              onClick={join} disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? "Joining..." : "Join Class →"}
            </button>
          </div>

          <div className="mt-4 bg-[#111827] border border-[#1f2937] rounded-xl p-4">
            <p className="text-gray-500 text-xs leading-relaxed">
              <span className="text-gray-400 font-semibold">💡 Tip:</span> After joining, keep this tab open in the background while watching YouTube. Your teacher can unmute you at any time.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Ad Banner */}
      <div className="w-full bg-[#111827] border-t border-[#1f2937] flex items-center justify-center py-3 min-h-[70px]">
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>
    </div>
  );
}

// ---- StudentMicView — same as before, just UI improved ----
function StudentMicView({ studentData, token }: {
  studentData: { id: string; name: string; rollNumber: string; roomName: string };
  token: string;
}) {
  const [micStatus, setMicStatus] = useState<"off" | "on">("off");
  const [copied, setCopied] = useState(false);
  const [connStatus, setConnStatus] = useState<"connecting" | "ready" | "error">("connecting");

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        streamRef.current = stream;
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        setConnStatus("ready");
      })
      .catch(() => setConnStatus("error"));
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const createPeerAndOffer = async (socket: Socket) => {
    if (!streamRef.current) return;
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]
    });
    peerRef.current = peer;
    streamRef.current.getTracks().forEach(track => peer.addTrack(track, streamRef.current!));
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("webrtc-ice", { candidate: e.candidate, roomToken: token, rollNumber: studentData.rollNumber, from: "student" });
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed") setTimeout(() => createPeerAndOffer(socket), 3000);
    };
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc-offer", { offer, rollNumber: studentData.rollNumber, roomToken: token });
    } catch (err) { console.error("Offer failed:", err); }
  };

  useEffect(() => {
    const socket = io({ path: "/socket.io", reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("student-join", { roomToken: token, rollNumber: studentData.rollNumber }));
    socket.on("initiate-connection", () => createPeerAndOffer(socket));
    socket.on("mic-control", (data: { rollNumber: string; micOn: boolean }) => {
      if (data.rollNumber !== studentData.rollNumber) return;
      streamRef.current?.getAudioTracks().forEach(t => { t.enabled = data.micOn; });
      setMicStatus(data.micOn ? "on" : "off");
    });
    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; rollNumber: string }) => {
      if (data.rollNumber !== studentData.rollNumber) return;
      peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.error);
    });
    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (data.from === "teacher") peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
    });
    return () => { socket.disconnect(); peerRef.current?.close(); };
  }, [token, studentData.rollNumber]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(studentData.rollNumber);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Top Ad */}
      <div className="w-full bg-[#111827] border-b border-[#1f2937] flex items-center justify-center py-2 min-h-[60px]">
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Room info */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 text-center">
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">✅ Joined</p>
            <h2 className="text-white text-lg font-bold">{studentData.roomName}</h2>
            <p className="text-gray-500 text-sm mt-1">Welcome, <span className="text-gray-300">{studentData.name}</span></p>
          </div>

          {/* Roll number */}
          <div className="bg-[#111827] border border-[#064e3b] rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-2">Your Roll Number</p>
            <p className="text-emerald-400 text-4xl font-mono font-bold mb-3">{studentData.rollNumber}</p>
            <p className="text-yellow-500 text-xs mb-3">📋 Copy and paste this in YouTube live chat when you have a doubt</p>
            <button
              onClick={handleCopy}
              className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              {copied ? "✅ Copied!" : "📋 Copy Roll Number"}
            </button>
          </div>

          {/* Mic status */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-3">🎙️ Mic Status</p>
            {connStatus === "error" ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-400 text-sm font-medium">Mic access denied — refresh and allow</p>
              </div>
            ) : connStatus === "connecting" ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 animate-pulse" />
                <p className="text-yellow-400 text-sm font-medium">Setting up mic...</p>
              </div>
            ) : micStatus === "off" ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />
                <p className="text-gray-400 text-sm">Muted — teacher will unmute when needed</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <p className="text-emerald-400 text-sm font-semibold">Live — teacher can hear you</p>
              </div>
            )}
            {connStatus === "ready" && (
              <p className="text-gray-600 text-xs mt-2">Keep this tab open — switch to YouTube freely</p>
            )}
          </div>

          {/* Steps */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
            <p className="text-blue-400 text-xs font-semibold mb-2">💡 How to raise a doubt</p>
            <ol className="text-gray-500 text-xs space-y-1 list-none">
              <li>1. Allow mic permission above ✅</li>
              <li>2. Open YouTube in <strong className="text-gray-400">another tab</strong></li>
              <li>3. Post your roll number in live chat</li>
              <li>4. Speak when teacher unmutes — no tab switch needed</li>
            </ol>
          </div>

          <button
            onClick={() => { localStorage.removeItem("classroom_student"); window.location.reload(); }}
            className="text-gray-600 hover:text-red-400 text-xs text-center transition"
          >
            Leave class & join with different name
          </button>
        </div>
      </main>

      {/* Bottom Ad */}
      <div className="w-full bg-[#111827] border-t border-[#1f2937] flex items-center justify-center py-3 min-h-[70px]">
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>
    </div>
  );
}