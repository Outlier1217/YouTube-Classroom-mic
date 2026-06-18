"use client";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export default function StudentPage() {
  const [step, setStep] = useState<"enter" | "joined">("enter");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<{ name: string; rollNumber: string; roomName: string } | null>(null);

  const join = async () => {
    if (!token.trim() || !name.trim()) { setError("Token and name both required"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/student/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setStudentData({ name: data.student.name, rollNumber: data.student.rollNumber, roomName: data.roomName });
    setStep("joined");
    setLoading(false);
  };

  if (step === "joined" && studentData) {
    return <StudentMicView studentData={studentData} token={token} />;
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white text-center">🎓 Join Class</h2>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste class token" className="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none" />
        <button onClick={join} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
          {loading ? "Joining..." : "Join Class"}
        </button>
      </div>
    </main>
  );
}

function StudentMicView({ studentData, token }: { studentData: { name: string; rollNumber: string; roomName: string }; token: string }) {
  const [micStatus, setMicStatus] = useState<"off" | "on">("off");
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.emit("student-join", { roomToken: token, rollNumber: studentData.rollNumber });

    socket.on("mic-control", async (data: { rollNumber: string; micOn: boolean }) => {
      if (data.rollNumber !== studentData.rollNumber) return;

      if (data.micOn) {
        await startMic(socket);
        setMicStatus("on");
      } else {
        stopMic();
        setMicStatus("off");
      }
    });

    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit }) => {
      peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit }) => {
      peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    return () => { socket.disconnect(); stopMic(); };
  }, [token, studentData.rollNumber]);

  const startMic = async (socket: Socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerRef.current = peer;

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-ice", { candidate: e.candidate, roomToken: token });
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc-offer", { offer, rollNumber: studentData.rollNumber, roomToken: token });
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopMic = () => {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-6">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-white mb-2">✅ Joined: {studentData.roomName}</h2>
        <p className="text-gray-400 mb-1">Name: <span className="text-white font-semibold">{studentData.name}</span></p>
        <div className="bg-gray-800 rounded-xl p-4 my-4">
          <p className="text-gray-400 text-sm mb-1">Your Roll Number</p>
          <p className="text-green-400 text-3xl font-mono font-bold">{studentData.rollNumber}</p>
        </div>
        <p className="text-yellow-400 text-sm">📋 Copy this roll number and paste it in YouTube live chat to raise a doubt</p>
        <button onClick={() => navigator.clipboard.writeText(studentData.rollNumber)} className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition">
          Copy Roll Number
        </button>
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">🎙️ Mic Status</p>
          {micStatus === "off"
            ? <p className="text-red-400 font-semibold mt-1">🔇 Muted — Teacher will unmute when needed</p>
            : <p className="text-green-400 font-semibold mt-1 animate-pulse">🎙️ Live — Teacher can hear you</p>
          }
          <p className="text-gray-500 text-xs mt-2">Keep this tab open in background while watching YouTube</p>
        </div>
      </div>
    </main>
  );
}
