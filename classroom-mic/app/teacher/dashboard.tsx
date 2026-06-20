"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface Student { id: string; name: string; rollNumber: string; }
interface Room { id: string; name: string; token: string; students: Student[]; }

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState("");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [searchRoll, setSearchRoll] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [copied, setCopied] = useState("");
  const [editingRoom, setEditingRoom] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Get channel name from session (email hidden)
  const channelName = (session?.user as { channelName?: string })?.channelName
    ?? session?.user?.name
    ?? "Teacher";

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("webrtc-offer", async (data: { offer: RTCSessionDescriptionInit; rollNumber: string; roomToken: string }) => {
      if (peersRef.current[data.rollNumber]) {
        peersRef.current[data.rollNumber].close();
      }
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peersRef.current[data.rollNumber] = peer;

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-ice", {
            candidate: e.candidate,
            roomToken: data.roomToken,
            rollNumber: data.rollNumber,
            from: "teacher",
          });
        }
      };

      peer.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.autoplay = true;
        audioRefs.current[data.rollNumber] = audio;
        audio.play().catch(console.error);
      };

      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc-answer", { answer, roomToken: data.roomToken, rollNumber: data.rollNumber });
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; rollNumber: string }) => {
      const peer = peersRef.current[data.rollNumber];
      if (peer && data.candidate) {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (activeRoom && socketRef.current) {
      socketRef.current.emit("teacher-join", activeRoom.token);
    }
  }, [activeRoom]);

  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.rooms ?? []);
  };

  useEffect(() => { fetchRooms(); }, []);

  const createRoom = async () => {
    if (!newRoom.trim()) return;
    setCreating(true);
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoom }),
    });
    setNewRoom("");
    await fetchRooms();
    setCreating(false);
  };

  const deleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room and all its students?")) return;
    await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    if (activeRoom?.id === roomId) setActiveRoom(null);
    fetchRooms();
  };

  const saveRoomEdit = async () => {
    if (!editingRoom || !editingRoom.name.trim()) return;
    await fetch(`/api/rooms/${editingRoom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingRoom.name }),
    });
    setEditingRoom(null);
    fetchRooms();
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm("Remove this student?")) return;
    await fetch(`/api/student/${studentId}`, { method: "DELETE" });
    if (foundStudent?.id === studentId) setFoundStudent(null);
    if (activeRoom) {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      const updated = data.rooms?.find((r: Room) => r.id === activeRoom.id);
      if (updated) setActiveRoom(updated);
      setRooms(data.rooms ?? []);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(""), 2000);
  };

  const searchStudent = async () => {
    if (!activeRoom || !searchRoll.trim()) return;
    const res = await fetch(`/api/student/search?roll=${searchRoll}&token=${activeRoom.token}`);
    const data = await res.json();
    setFoundStudent(data.student ?? null);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Topbar */}
      <header className="bg-[#111827] border-b border-[#1f2937] px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-base">🎙️</div>
          <span className="text-white font-semibold text-sm">Classroom Mic</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Channel name shown, email hidden */}
          <span className="text-xs font-semibold text-blue-400 bg-blue-950/60 border border-blue-900 px-3 py-1 rounded-lg">
            {channelName}
          </span>
          <button
            onClick={() => signOut()}
            className="text-xs text-gray-500 hover:text-gray-300 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Top Ad */}
      <div className="w-full bg-[#111827] border-b border-[#1f2937] flex items-center justify-center py-2 min-h-[60px]">
        {/* Replace with AdSense */}
        <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
      </div>

      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 p-5 flex flex-col gap-5 min-w-0">

          {/* Create Room */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-3">Create new room</h2>
            <div className="flex gap-3">
              <input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                placeholder="Room name (e.g. Physics Batch A)"
                className="flex-1 bg-[#0d1117] border border-[#1f2937] focus:border-blue-600 text-white placeholder-gray-600 px-4 py-2.5 rounded-xl outline-none text-sm transition"
              />
              <button
                onClick={createRoom}
                disabled={creating || !newRoom.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {creating
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : "+ Create Room"}
              </button>
            </div>
          </div>

          {/* Rooms list */}
          <div className="flex flex-col gap-3">
            {rooms.length === 0 && (
              <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8 text-center">
                <p className="text-gray-600 text-sm">No rooms yet — create one above</p>
              </div>
            )}

            {rooms.map((room) => (
              <div
                key={room.id}
                className={`bg-[#111827] rounded-2xl border transition ${
                  activeRoom?.id === room.id
                    ? "border-blue-600"
                    : "border-[#1f2937] hover:border-[#374151]"
                }`}
              >
                {/* Room header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setActiveRoom(activeRoom?.id === room.id ? null : room)}
                >
                  {editingRoom?.id === room.id ? (
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="flex-1 bg-[#0d1117] border border-[#374151] focus:border-blue-500 text-white px-3 py-2 rounded-lg outline-none text-sm"
                        autoFocus
                      />
                      <button
                        onClick={saveRoomEdit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRoom(null)}
                        className="bg-[#1f2937] text-gray-400 px-4 py-2 rounded-lg text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <h3 className="text-white font-semibold text-sm">{room.name}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">{room.students.length} student{room.students.length !== 1 ? "s" : ""} joined</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="bg-[#0d1117] border border-[#064e3b] text-emerald-400 text-xs px-2.5 py-1 rounded-lg font-mono">
                          {room.token}
                        </code>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToken(room.token); }}
                          className="text-xs text-gray-400 hover:text-white bg-[#1f2937] hover:bg-[#374151] border border-[#374151] px-3 py-1.5 rounded-lg transition"
                        >
                          {copied === room.token ? "✓ Copied" : "Copy token"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRoom({ id: room.id, name: room.name }); }}
                          className="text-xs text-yellow-500 hover:text-yellow-300 bg-[#1f2937] hover:bg-yellow-950/30 border border-[#374151] hover:border-yellow-900 px-3 py-1.5 rounded-lg transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                          className="text-xs text-red-500 hover:text-red-300 bg-[#1f2937] hover:bg-red-950/30 border border-[#374151] hover:border-red-900 px-3 py-1.5 rounded-lg transition"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active room — search + students */}
                {activeRoom?.id === room.id && (
                  <div className="border-t border-[#1f2937] p-5 flex flex-col gap-4">
                    {/* Search */}
                    <div>
                      <p className="text-gray-500 text-xs mb-2">Search student by roll number</p>
                      <div className="flex gap-3">
                        <input
                          value={searchRoll}
                          onChange={(e) => setSearchRoll(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchStudent()}
                          placeholder="Paste roll number (e.g. STU1234)"
                          className="flex-1 bg-[#0d1117] border border-[#1f2937] focus:border-emerald-600 text-white placeholder-gray-600 px-4 py-2.5 rounded-xl outline-none text-sm font-mono transition"
                        />
                        <button
                          onClick={searchStudent}
                          className="bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap"
                        >
                          Search
                        </button>
                      </div>
                    </div>

                    {/* Found student */}
                    {foundStudent && (
                      <div className="bg-[#0d1117] border border-[#064e3b] rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-white font-semibold text-sm">{foundStudent.name}</p>
                          <p className="text-emerald-400 font-mono text-xs mt-0.5">{foundStudent.rollNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MicControl
                            student={foundStudent}
                            roomToken={room.token}
                            socket={socketRef.current}
                          />
                          <button
                            onClick={() => deleteStudent(foundStudent.id)}
                            className="text-xs text-red-500 hover:text-red-300 bg-[#1f2937] border border-[#7f1d1d] hover:bg-red-950/30 px-3 py-2 rounded-lg transition"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* All students */}
                    {room.students.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-2">All students ({room.students.length})</p>
                        <div className="flex flex-col gap-1.5">
                          {room.students.map((s) => (
                            <div
                              key={s.id}
                              className="bg-[#0d1117] border border-[#1f2937] rounded-xl px-4 py-2.5 flex justify-between items-center"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1f2937] flex items-center justify-center text-xs text-gray-400 font-semibold">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-gray-300 text-sm">{s.name}</span>
                                <code className="text-emerald-400 font-mono text-xs">{s.rollNumber}</code>
                              </div>
                              <button
                                onClick={() => deleteStudent(s.id)}
                                className="text-xs text-red-600 hover:text-red-400 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {room.students.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-600 text-xs">No students yet — share the token above</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom ad for mobile */}
          <div className="lg:hidden w-full bg-[#111827] border border-[#1f2937] rounded-xl flex items-center justify-center py-3 min-h-[70px]">
            <span className="text-[#374151] text-xs font-mono">[ Advertisement ]</span>
          </div>
        </main>

        {/* Right sidebar ad — desktop only */}
        <aside className="hidden lg:flex w-44 bg-[#111827] border-l border-[#1f2937] flex-col items-center justify-start gap-4 p-4 pt-6">
          <p className="text-[#374151] text-[9px] font-mono uppercase tracking-wider">Sponsored</p>
          {/* Replace with AdSense units */}
          <div className="w-[120px] h-[240px] bg-[#1f2937] rounded-lg flex items-center justify-center">
            <span className="text-[#374151] text-[9px] font-mono text-center leading-relaxed">Ad<br/>120×240</span>
          </div>
          <div className="w-[120px] h-[240px] bg-[#1f2937] rounded-lg flex items-center justify-center">
            <span className="text-[#374151] text-[9px] font-mono text-center leading-relaxed">Ad<br/>120×240</span>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-[#111827] border-t border-[#1f2937] py-3 px-5 flex items-center justify-between">
        <p className="text-gray-700 text-xs">© 2026 Outlier Lab</p>
        <a
          href="https://youtube.com/@Outlier-lab"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-400 text-xs transition"
        >
          YouTube →
        </a>
      </footer>
    </div>
  );
}

function MicControl({
  student,
  roomToken,
  socket,
}: {
  student: Student;
  roomToken: string;
  socket: Socket | null;
}) {
  const [micOn, setMicOn] = useState(false);

  const toggle = () => {
    const newState = !micOn;
    setMicOn(newState);
    socket?.emit("toggle-mic", {
      roomToken,
      rollNumber: student.rollNumber,
      micOn: newState,
    });
  };

  return (
    <button
      onClick={toggle}
      className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all active:scale-95 ${
        micOn
          ? "bg-red-600 hover:bg-red-700 text-white"
          : "bg-[#1f2937] hover:bg-[#374151] text-gray-300 border border-[#374151]"
      }`}
    >
      {micOn ? "🎙️ Mic ON — Mute" : "🔇 Unmute mic"}
    </button>
  );
}