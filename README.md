# 🎙️ YouTube Classroom Mic System

A real-time classroom microphone management system built with Next.js 16, Socket.io, and WebRTC. Teachers can remotely unmute individual students during YouTube live streams, enabling one-way voice communication from student to teacher — all controlled entirely by the teacher.

---

## 📌 What It Does

During a YouTube live class, students watch the stream as usual. When a student has a doubt, they post their **roll number** in the YouTube live chat. The teacher copies that roll number, searches for the student in this web app, and unmutes their microphone. The student's voice is then transmitted directly to the teacher's browser via WebRTC — without interrupting the YouTube stream.

**Key behavior:**
- Student's mic is **always muted by default**
- Teacher has **full remote control** over every student's mic
- Voice travels **one-way only**: student → teacher
- Teacher replies through the **YouTube live stream** (not this app)
- Student keeps this app **open in a background tab** while watching YouTube

---

## 🏗️ Architecture

```
Teacher Browser                          Student Browser
──────────────                           ───────────────
Next.js Teacher Dashboard                Next.js Student Page
  ├── Register / Login (NextAuth)          ├── Paste Token → Join Class
  ├── Create Rooms → Get Tokens            ├── Enter Name → Get Roll Number
  ├── Search Student by Roll No.           ├── Copy Roll No. → YouTube Chat
  └── Mic Toggle Button                    └── Background tab stays open
         │                                        │
         └──────────── Socket.io ─────────────────┘
                       (mic-control events)
                              │
                         WebRTC Audio
                    (student mic → teacher)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v4 (Credentials Provider) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma v7 |
| Real-time | Socket.io v4 |
| Audio | WebRTC (browser-native) |
| Package Manager | pnpm |
| Runtime Server | Custom Node.js HTTP server (`server.ts`) |

---

## 📁 Project Structure

```
classroom-mic/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth credentials handler
│   │   ├── teacher/register/route.ts     # Teacher registration API
│   │   ├── rooms/route.ts                # Create & fetch rooms
│   │   └── student/
│   │       ├── join/route.ts             # Student join + roll number assign
│   │       └── search/route.ts           # Search student by roll number
│   ├── teacher/
│   │   ├── page.tsx                      # Login / Register page
│   │   └── dashboard.tsx                 # Teacher dashboard + mic control
│   ├── student/
│   │   └── page.tsx                      # Student join + mic view
│   ├── generated/prisma/                 # Prisma generated client
│   ├── providers.tsx                     # NextAuth SessionProvider wrapper
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Home — Teacher / Student selector
├── lib/
│   └── prisma.ts                         # Prisma client singleton (with PrismaPg adapter)
├── prisma/
│   ├── schema.prisma                     # DB schema (Teacher, Room, Student)
│   └── migrations/                       # Migration history
├── server.ts                             # Custom HTTP server with Socket.io
├── prisma.config.ts                      # Prisma v7 config (datasource URL)
├── .env                                  # Environment variables
└── package.json
```

---

## 🗃️ Database Schema

### Teacher
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| email | String | Unique |
| password | String | Bcrypt hashed |
| channelName | String | Unique (e.g. "Outlier Lab") |
| createdAt | DateTime | Auto |

### Room
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | e.g. "Blockchain Tech" |
| token | String | Unique, auto-generated (shared with students) |
| teacherId | String | FK → Teacher |
| createdAt | DateTime | Auto |

### Student
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Self-entered on join |
| rollNumber | String | Auto-assigned (e.g. STU6658) |
| roomId | String | FK → Room |
| joinedAt | DateTime | Auto |

---

## ⚙️ How It Works — Step by Step

### Teacher Flow
1. Go to `/teacher` → Register with email, password, and channel name
2. Login → Reach Teacher Dashboard
3. Create a **Room** (e.g. "Blockchain Tech Batch A")
4. A unique **token** is auto-generated for that room
5. Copy the token → Share with students (WhatsApp, Telegram, etc.)
6. During live class: paste a student's roll number in the search bar → click **Search**
7. Click **Mic OFF → Click to Unmute** to open the student's mic
8. Hear the student's voice live in your browser
9. Click again to mute the student

### Student Flow
1. Go to `/student` → Paste the token received from teacher
2. Enter your name → Click **Join Class**
3. Receive a **random roll number** (e.g. STU6658)
4. Copy the roll number → Go to YouTube live stream
5. Post roll number in YouTube chat when you have a doubt (e.g. `STU6658 doubt about consensus mechanism`)
6. Keep the classroom tab **open in the background**
7. When teacher unmutes you → your mic activates automatically
8. Speak your doubt → teacher hears it in real-time

---

## 🔌 Socket.io Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `teacher-join` | Client → Server | `roomToken` | Teacher subscribes to room |
| `student-join` | Client → Server | `{ roomToken, rollNumber }` | Student subscribes to room |
| `toggle-mic` | Teacher → Server | `{ roomToken, rollNumber, micOn }` | Teacher toggles student mic |
| `mic-control` | Server → All in room | `{ rollNumber, micOn }` | Broadcast mic state change |
| `webrtc-offer` | Student → Server | `{ offer, rollNumber, roomToken }` | WebRTC offer from student |
| `webrtc-answer` | Teacher → Server | `{ answer, roomToken }` | WebRTC answer from teacher |
| `webrtc-ice` | Both → Server | `{ candidate, roomToken }` | ICE candidate exchange |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database (Neon recommended)

### 1. Clone and install

```bash
git clone https://github.com/Outlier1217/YouTube-Classroom-mic.git
cd YouTube-Classroom-mic/classroom-mic
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="your-32-char-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Approve Prisma build scripts

```bash
pnpm approve-builds
# Select @prisma/engines and prisma → confirm
```

### 5. Run the development server

```bash
pnpm dev
```

App runs at `http://localhost:3000`

---

## 🌐 VPS Deployment (Ubuntu)

### 1. Install dependencies on VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm pm2
```

### 2. Clone and set up

```bash
git clone https://github.com/Outlier1217/YouTube-Classroom-mic.git
cd YouTube-Classroom-mic/classroom-mic
pnpm install
```

### 3. Configure environment

```bash
nano .env
# Add DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (your domain)
```

### 4. Build and start with PM2

```bash
pnpm build
pm2 start pnpm --name "classroom-mic" -- start
pm2 save
pm2 startup
```

### 5. Nginx reverse proxy (optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> **Important:** Socket.io requires WebSocket support. The `Upgrade` and `Connection` headers in the Nginx config above are required for WebSocket connections to work correctly.

---

## 🔐 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Random 32-char string for session signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL where the app is hosted | `https://yourdomain.com` |

---

## 📦 Key Dependencies

```json
{
  "next": "16.2.9",
  "next-auth": "^4.24.14",
  "socket.io": "^4.8.3",
  "socket.io-client": "^4.8.3",
  "@prisma/client": "^7.8.0",
  "@prisma/adapter-pg": "latest",
  "pg": "latest",
  "bcryptjs": "^3.0.3",
  "tsx": "latest"
}
```

---

## ⚠️ Important Notes

- **WebRTC audio is one-way only.** Voice goes from student → teacher. Teacher's voice goes through YouTube live stream, not this app.
- **Student mic is always off by default.** It only activates when the teacher explicitly unmutes it.
- **Students must keep the tab open** in the background for the mic connection to remain active.
- **Vercel is not supported** for deployment because it uses serverless functions which do not support persistent WebSocket connections. Use a VPS (Hostinger, DigitalOcean, Railway, Render) instead.
- **Prisma v7** requires the `@prisma/adapter-pg` driver adapter — direct `datasourceUrl` in the constructor is not supported.
- **NEXTAUTH_URL** must match the exact URL where the app runs, including protocol (`https://` in production).

---

## 🧑‍💻 Author

**Mustak Aalam**
- GitHub: [@Outlier1217](https://github.com/Outlier1217)
- YouTube: [@Outlier-lab](https://youtube.com/@Outlier-lab)

---

## 📄 License

MIT License — free to use, modify, and distribute.
