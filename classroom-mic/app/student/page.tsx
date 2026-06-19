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
    id: string; name: string; rollNumber: string; roomName: string
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
  const micOnRef = useRef(false);

  // Acquire mic once — while tab is visible
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        streamRef.current = stream;
        // Start muted
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        setConnStatus("ready");
        console.log("Mic acquired");
      })
      .catch(err => {
        console.error("Mic error:", err);
        setConnStatus("error");
      });

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const createPeerAndOffer = async (socket: Socket) => {
    if (!streamRef.current) { console.log("No stream yet"); return; }

    // Close old peer
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    console.log("Creating peer connection...");
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ]
    });
    peerRef.current = peer;

    // Add muted track
    streamRef.current.getTracks().forEach(track => {
      peer.addTrack(track, streamRef.current!);
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc-ice", {
          candidate: e.candidate,
          roomToken: token,
          rollNumber: studentData.rollNumber,
          from: "student",
        });
      }
    };

    peer.onconnectionstatechange = () => {
      console.log("Peer:", peer.connectionState);
      if (peer.connectionState === "failed") {
        // Retry after 3 seconds
        setTimeout(() => createPeerAndOffer(socket), 3000);
      }
    };

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc-offer", {
        offer,
        rollNumber: studentData.rollNumber,
        roomToken: token,
      });
      console.log("Offer sent to teacher");
    } catch (err) {
      console.error("Offer failed:", err);
    }
  };

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("student-join", { roomToken: token, rollNumber: studentData.rollNumber });
    });

    // Server tells student to initiate WebRTC (teacher is ready)
    socket.on("initiate-connection", () => {
      console.log("Teacher ready — initiating WebRTC");
      createPeerAndOffer(socket);
    });

    // Teacher toggles mic — ONLY track enable/disable, no new offer
    socket.on("mic-control", (data: { rollNumber: string; micOn: boolean }) => {
      if (data.rollNumber !== studentData.rollNumber) return;
      console.log("Mic control:", data.micOn);
      micOnRef.current = data.micOn;

      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => {
          t.enabled = data.micOn;
        });
      }
      setMicStatus(data.micOn ? "on" : "off");
    });

    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; rollNumber: string }) => {
      if (data.rollNumber !== studentData.rollNumber) return;
      console.log("Got answer from teacher");
      peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer))
        .catch(console.error);
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (data.from === "teacher") {
        peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(console.error);
      }
    });

    return () => {
      socket.disconnect();
      peerRef.current?.close();
    };
  }, [token, studentData.rollNumber]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(studentData.rollNumber);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleLeave = () => {
    localStorage.removeItem("classroom_student");
    window.location.reload();
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
        <button onClick={handleCopy} className="mt-4 bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm transition font-semibold">
          {copied ? "✅ Copied!" : "📋 Copy Roll Number"}
        </button>

        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">🎙️ Mic Status</p>
          {connStatus === "error" ? (
            <p className="text-red-400 font-semibold mt-1">❌ Mic access denied — please refresh and allow</p>
          ) : connStatus === "connecting" ? (
            <p className="text-yellow-400 font-semibold mt-1">⏳ Setting up mic...</p>
          ) : micStatus === "off" ? (
            <p className="text-red-400 font-semibold mt-1">🔇 Muted — Teacher will unmute when needed</p>
          ) : (
            <p className="text-green-400 font-semibold mt-1 animate-pulse">🎙️ Live — Teacher can hear you</p>
          )}
          <p className="text-gray-500 text-xs mt-2">Keep this tab open in background while watching YouTube</p>
        </div>

        {connStatus === "ready" && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-green-500 text-xs">Mic ready — switch tabs freely</span>
          </div>
        )}

        <div className="mt-4 bg-blue-900/30 border border-blue-700/50 rounded-xl p-3 text-left">
          <p className="text-blue-400 text-xs font-semibold mb-1">💡 How to use</p>
          <p className="text-blue-200/70 text-xs">
            1. Allow mic permission ✅<br />
            2. Open YouTube in <strong>another tab</strong><br />
            3. Raise doubt with your roll number in chat<br />
            4. Speak when teacher unmutes — <strong>no tab switching needed</strong>
          </p>
        </div>

        <button onClick={handleLeave} className="mt-4 text-gray-500 hover:text-red-400 text-xs transition">
          Leave class & join with different name
        </button>
      </div>
    </main>
  );
}
