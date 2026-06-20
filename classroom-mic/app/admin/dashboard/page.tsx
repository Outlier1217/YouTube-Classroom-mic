"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = { teachers: number; rooms: number; students: number };
type Teacher = { id: string; email: string; channelName: string; createdAt: string; _count: { rooms: number } };
type Room = { id: string; name: string; token: string; createdAt: string; teacher: { channelName: string; email: string }; _count: { students: number } };
type Student = { id: string; name: string; rollNumber: string; joinedAt: string; room: { name: string; token: string } };

type Tab = "dashboard" | "teachers" | "rooms" | "students" | "live";

function LiveMonitor() {
  const [data, setData] = useState<{
    activeSessions: number;
    totalConnectedStudents: number;
    sessions: { token: string; roomName: string; teacherChannel: string; connectedStudents: string[]; studentCount: number }[];
  } | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  async function fetchLive() {
    setLiveLoading(true);
    const res = await fetch("/api/admin/live");
    if (res.ok) setData(await res.json());
    setLiveLoading(false);
  }

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 5000); // auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (liveLoading && !data) return (
    <div className="text-center py-12 text-gray-500">Fetching live data...</div>
  );

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Active sessions</p>
          <p className="text-3xl font-semibold text-green-400">{data?.activeSessions ?? 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Connected students</p>
          <p className="text-3xl font-semibold text-teal-400">{data?.totalConnectedStudents ?? 0}</p>
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="font-medium text-sm">Live sessions</p>
          <button
            onClick={fetchLive}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded-md transition flex items-center gap-1"
          >
            <span className="ti ti-refresh text-xs" /> Refresh
          </button>
        </div>
        {data?.sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No active sessions right now
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-400 text-xs">
                <th className="text-left px-5 py-3 font-medium">Room</th>
                <th className="text-left px-5 py-3 font-medium">Teacher</th>
                <th className="text-left px-5 py-3 font-medium">Students online</th>
                <th className="text-left px-5 py-3 font-medium">Roll numbers</th>
              </tr>
            </thead>
            <tbody>
              {data?.sessions.map((s) => (
                <tr key={s.token} className="border-b border-gray-800 last:border-0">
                  <td className="px-5 py-3 font-medium">{s.roomName}</td>
                  <td className="px-5 py-3 text-gray-400">{s.teacherChannel}</td>
                  <td className="px-5 py-3">
                    <span className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded-full">
                      {s.studentCount} online
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.connectedStudents.map((r) => (
                        <code key={r} className="text-xs text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">
                          {r}
                        </code>
                      ))}
                      {s.connectedStudents.length === 0 && (
                        <span className="text-gray-600 text-xs">No students yet</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-600 text-center">Auto-refreshes every 5 seconds</p>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchStats() {
    const res = await fetch("/api/admin/data?type=stats");
    if (res.ok) setStats(await res.json());
  }

  async function fetchTab(t: Tab) {
    setLoading(true);
    if (t === "teachers" && teachers.length === 0) {
      const res = await fetch("/api/admin/data?type=teachers");
      if (res.ok) setTeachers(await res.json());
    }
    if (t === "rooms" && rooms.length === 0) {
      const res = await fetch("/api/admin/data?type=rooms");
      if (res.ok) setRooms(await res.json());
    }
    if (t === "students" && students.length === 0) {
      const res = await fetch("/api/admin/data?type=students");
      if (res.ok) setStudents(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTab(tab); }, [tab]);

  async function deleteItem(type: string, id: string) {
    if (!confirm(`Delete this ${type}?`)) return;
    await fetch(`/api/admin/data?type=${type}&id=${id}`, { method: "DELETE" });
    if (type === "teacher") setTeachers((p) => p.filter((x) => x.id !== id));
    if (type === "room") setRooms((p) => p.filter((x) => x.id !== id));
    if (type === "student") setStudents((p) => p.filter((x) => x.id !== id));
    fetchStats();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const navItems: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "teachers", label: "Teachers", icon: "users" },
    { key: "rooms", label: "Rooms", icon: "door" },
    { key: "students", label: "Students", icon: "user-circle" },
    { key: "live", label: "Live Monitor", icon: "activity" },
  ];

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.room.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white text-sm overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col py-4 shrink-0">
        <div className="px-4 pb-4 mb-2 border-b border-gray-800">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Classroom Mic</p>
          <p className="text-white font-semibold mt-1">Admin Panel</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                tab === n.key
                  ? "bg-violet-600/20 text-violet-400 font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className={`ti ti-${n.icon} text-base`} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-2 pt-2 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white w-full transition"
          >
            <span className="ti ti-logout text-base" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
          <h1 className="font-semibold capitalize">{tab === "live" ? "Live Monitor" : tab}</h1>
          {stats && (
            <div className="flex gap-4 text-xs text-gray-400">
              <span>{stats.teachers} teachers</span>
              <span>{stats.rooms} rooms</span>
              <span>{stats.students} students</span>
            </div>
          )}
        </header>

        <div className="p-6 space-y-6">
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Teachers", val: stats?.teachers, color: "text-violet-400" },
                  { label: "Total Rooms", val: stats?.rooms, color: "text-teal-400" },
                  { label: "Total Students", val: stats?.students, color: "text-orange-400" },
                ].map((c) => (
                  <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <p className="text-gray-400 text-xs mb-1">{c.label}</p>
                    <p className={`text-3xl font-semibold ${c.color}`}>{c.val ?? "—"}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-300 font-medium mb-3">Quick links</p>
                <div className="flex gap-3 flex-wrap">
                  {(["teachers", "rooms", "students"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-violet-600/20 hover:text-violet-300 text-gray-300 transition capitalize"
                    >
                      View {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TEACHERS */}
          {tab === "teachers" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left px-5 py-3 font-medium">Channel</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Rooms</th>
                    <th className="text-left px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading...</td></tr>
                  )}
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3 font-medium">{t.channelName}</td>
                      <td className="px-5 py-3 text-gray-400">{t.email}</td>
                      <td className="px-5 py-3">
                        <span className="bg-violet-600/20 text-violet-300 text-xs px-2 py-0.5 rounded-full">
                          {t._count.rooms} rooms
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteItem("teacher", t.id)}
                          className="text-xs text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-800 px-2 py-1 rounded-md transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && teachers.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No teachers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ROOMS */}
          {tab === "rooms" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left px-5 py-3 font-medium">Room name</th>
                    <th className="text-left px-5 py-3 font-medium">Teacher</th>
                    <th className="text-left px-5 py-3 font-medium">Token</th>
                    <th className="text-left px-5 py-3 font-medium">Students</th>
                    <th className="text-left px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
                  )}
                  {rooms.map((r) => (
                    <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-5 py-3 text-gray-400">{r.teacher.channelName}</td>
                      <td className="px-5 py-3">
                        <code className="text-xs text-teal-400 bg-teal-900/20 px-2 py-0.5 rounded font-mono">
                          {r.token}
                        </code>
                      </td>
                      <td className="px-5 py-3 text-gray-300">{r._count.students}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteItem("room", r.id)}
                          className="text-xs text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-800 px-2 py-1 rounded-md transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && rooms.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No rooms found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STUDENTS */}
          {tab === "students" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search by name, roll number or room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500"
              />
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-800">
                    <tr className="text-gray-400 text-xs">
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-left px-5 py-3 font-medium">Roll No.</th>
                      <th className="text-left px-5 py-3 font-medium">Room</th>
                      <th className="text-left px-5 py-3 font-medium">Token</th>
                      <th className="text-left px-5 py-3 font-medium">Joined</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
                    )}
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                        <td className="px-5 py-3 font-medium">{s.name}</td>
                        <td className="px-5 py-3">
                          <code className="text-xs text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded font-mono">
                            {s.rollNumber}
                          </code>
                        </td>
                        <td className="px-5 py-3 text-gray-400">{s.room.name}</td>
                        <td className="px-5 py-3">
                          <code className="text-xs text-gray-500 font-mono">{s.room.token}</code>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(s.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => deleteItem("student", s.id)}
                            className="text-xs text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-800 px-2 py-1 rounded-md transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && filteredStudents.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">No students found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LIVE MONITOR */}
            {/* LIVE MONITOR */}
            {tab === "live" && <LiveMonitor />}
        </div>
      </main>
    </div>
  );
}