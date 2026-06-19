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
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("webrtc-offer", async (data: { offer: RTCSessionDescriptionInit; rollNumber: string; roomToken: string }) => {
      const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peersRef.current[data.rollNumber] = peer;
      peer.onicecandidate = (e) => {
        if (e.candidate) socket.emit("webrtc-ice", { candidate: e.candidate, roomToken: data.roomToken });
      };
      peer.ontrack = (e) => {
        if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.autoplay = true; }
        audioRef.current.srcObject = e.streams[0];
      };
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc-answer", { answer, roomToken: data.roomToken });
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit }) => {
      Object.values(peersRef.current).forEach(peer => peer.addIceCandidate(new RTCIceCandidate(data.candidate)));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (activeRoom && socketRef.current) socketRef.current.emit("teacher-join", activeRoom.token);
  }, [activeRoom]);

  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.rooms ?? []);
  };

  useEffect(() => { fetchRooms(); }, []);

  const createRoom = async () => {
    if (!newRoom.trim()) return;
    await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newRoom }) });
    setNewRoom(""); fetchRooms();
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
    setEditingRoom(null); fetchRooms();
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
    setCopied(token); setTimeout(() => setCopied(""), 2000);
  };

  const searchStudent = async () => {
    if (!activeRoom || !searchRoll.trim()) return;
    const res = await fetch(`/api/student/search?roll=${searchRoll}&token=${activeRoom.token}`);
    const data = await res.json();
    setFoundStudent(data.student ?? null);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">👨‍🏫 Teacher Dashboard</h1>
            <p className="text-gray-400">{session?.user?.email}</p>
          </div>
          <button onClick={() => signOut()} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition">Logout</button>
        </div>

        {/* Create Room */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
          <div className="flex gap-3">
            <input value={newRoom} onChange={e => setNewRoom(e.target.value)} onKeyDown={e => e.key === "Enter" && createRoom()} placeholder="Room name (e.g. Physics Batch A)" className="flex-1 bg-gray-800 px-4 py-3 rounded-lg outline-none" />
            <button onClick={createRoom} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">Create</button>
          </div>
        </div>

        {/* Rooms List */}
        <div className="grid gap-4 mb-6">
          {rooms.map(room => (
            <div key={room.id} className={`bg-gray-900 rounded-2xl p-5 border-2 transition ${activeRoom?.id === room.id ? "border-blue-500" : "border-transparent hover:border-gray-700"}`}>
              {editingRoom?.id === room.id ? (
                <div className="flex gap-3 items-center">
                  <input value={editingRoom.name} onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })} className="flex-1 bg-gray-800 px-4 py-2 rounded-lg outline-none" autoFocus />
                  <button onClick={saveRoomEdit} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
                  <button onClick={() => setEditingRoom(null)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="cursor-pointer flex-1" onClick={() => setActiveRoom(room)}>
                    <h3 className="text-lg font-semibold">{room.name}</h3>
                    <p className="text-gray-400 text-sm">{room.students.length} students joined</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <code className="bg-gray-800 px-3 py-1 rounded text-xs text-green-400">{room.token}</code>
                    <button onClick={() => copyToken(room.token)} className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm transition">
                      {copied === room.token ? "✓ Copied" : "Copy Token"}
                    </button>
                    <button onClick={() => setEditingRoom({ id: room.id, name: room.name })} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm transition">✏️ Edit</button>
                    <button onClick={() => deleteRoom(room.id)} className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm transition">🗑️ Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {rooms.length === 0 && <p className="text-gray-500 text-center py-8">No rooms yet. Create one above.</p>}
        </div>

        {/* Active Room */}
        {activeRoom && (
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Search Student in: {activeRoom.name}</h2>
            <div className="flex gap-3 mb-6">
              <input value={searchRoll} onChange={e => setSearchRoll(e.target.value)} onKeyDown={e => e.key === "Enter" && searchStudent()} placeholder="Paste roll number (e.g. STU1234)" className="flex-1 bg-gray-800 px-4 py-3 rounded-lg outline-none" />
              <button onClick={searchStudent} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition">Search</button>
            </div>

            {foundStudent && (
              <div className="bg-gray-800 rounded-xl p-5 mb-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <p className="text-lg font-semibold">{foundStudent.name}</p>
                    <p className="text-green-400 font-mono">{foundStudent.rollNumber}</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <MicControl student={foundStudent} roomToken={activeRoom.token} socket={socketRef.current} />
                    <button onClick={() => deleteStudent(foundStudent.id)} className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded-lg text-sm transition">🗑️ Remove</button>
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-gray-400 text-sm mb-3">All Students in Room ({activeRoom.students.length})</h3>
            <div className="flex flex-col gap-2">
              {activeRoom.students.map(s => (
                <div key={s.id} className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span>{s.name} <span className="text-green-400 font-mono text-sm ml-2">{s.rollNumber}</span></span>
                  <button onClick={() => deleteStudent(s.id)} className="text-red-400 hover:text-red-300 text-sm transition">🗑️ Remove</button>
                </div>
              ))}
              {activeRoom.students.length === 0 && <p className="text-gray-600 text-sm text-center py-4">No students yet</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MicControl({ student, roomToken, socket }: { student: Student; roomToken: string; socket: Socket | null }) {
  const [micOn, setMicOn] = useState(false);
  const toggle = () => {
    const newState = !micOn;
    setMicOn(newState);
    socket?.emit("toggle-mic", { roomToken, rollNumber: student.rollNumber, micOn: newState });
  };
  return (
    <button onClick={toggle} className={`px-5 py-2 rounded-xl font-semibold transition text-sm ${micOn ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}>
      {micOn ? "🎙️ Mic ON — Mute" : "🔇 Unmute"}
    </button>
  );
}
