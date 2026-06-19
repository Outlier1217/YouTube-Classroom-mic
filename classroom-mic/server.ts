import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Track teacher socket per room
  const teacherSockets = new Map<string, string>(); // roomToken -> socketId

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("teacher-join", (roomToken: string) => {
      socket.join(`room:${roomToken}`);
      teacherSockets.set(roomToken, socket.id);
      console.log(`Teacher ${socket.id} joined room:${roomToken}`);
    });

    socket.on("student-join", (data: { roomToken: string; rollNumber: string }) => {
      socket.join(`room:${data.roomToken}`);
      socket.data.rollNumber = data.rollNumber;
      socket.data.roomToken = data.roomToken;
      console.log(`Student ${data.rollNumber} joined room:${data.roomToken}`);
    });

    socket.on("toggle-mic", (data: { roomToken: string; rollNumber: string; micOn: boolean }) => {
      console.log(`Mic toggle: ${data.rollNumber} -> ${data.micOn}`);
      io.to(`room:${data.roomToken}`).emit("mic-control", {
        rollNumber: data.rollNumber,
        micOn: data.micOn,
      });
    });

    // Student sends offer -> forward to teacher only
    socket.on("webrtc-offer", (data: { offer: RTCSessionDescriptionInit; rollNumber: string; roomToken: string }) => {
      console.log(`WebRTC offer from ${data.rollNumber}`);
      const teacherSocketId = teacherSockets.get(data.roomToken);
      if (teacherSocketId) {
        io.to(teacherSocketId).emit("webrtc-offer", data);
      }
    });

    // Teacher sends answer -> forward to that student only
    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; roomToken: string; rollNumber: string }) => {
      console.log(`WebRTC answer for ${data.rollNumber}`);
      io.to(`room:${data.roomToken}`).emit("webrtc-answer", {
        answer: data.answer,
        rollNumber: data.rollNumber,
      });
    });

    // ICE candidates
    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; roomToken: string; rollNumber: string; from: string }) => {
      if (data.from === "student") {
        const teacherSocketId = teacherSockets.get(data.roomToken);
        if (teacherSocketId) io.to(teacherSocketId).emit("webrtc-ice", data);
      } else {
        io.to(`room:${data.roomToken}`).emit("webrtc-ice", data);
      }
    });

    socket.on("disconnect", () => {
      // Clean up teacher socket tracking
      teacherSockets.forEach((socketId, token) => {
        if (socketId === socket.id) teacherSockets.delete(token);
      });
      console.log("Disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
  });
});
