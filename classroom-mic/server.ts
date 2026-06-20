import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { teacherSockets, studentPeers } from "./lib/liveStore"; // ← ADD

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
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ← REMOVE these two lines (ab liveStore se aa raha hai)
  // const teacherSockets = new Map<string, string>();
  // const studentPeers = new Map<string, string>();

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("teacher-join", (roomToken: string) => {
      socket.join(`room:${roomToken}`);
      teacherSockets.set(roomToken, socket.id);
      console.log(`Teacher ${socket.id} joined room:${roomToken}`);
      socket.to(`room:${roomToken}`).emit("initiate-connection", { roomToken });
    });

    socket.on("student-join", (data: { roomToken: string; rollNumber: string }) => {
      socket.join(`room:${data.roomToken}`);
      socket.data.rollNumber = data.rollNumber;
      socket.data.roomToken = data.roomToken;
      // ← CHANGE: object store karo sirf string nahi
      studentPeers.set(data.rollNumber, { socketId: socket.id, roomToken: data.roomToken });
      console.log(`Student ${data.rollNumber} joined room:${data.roomToken}`);
      if (teacherSockets.has(data.roomToken)) {
        socket.emit("initiate-connection", { roomToken: data.roomToken });
      }
    });

    socket.on("toggle-mic", (data: { roomToken: string; rollNumber: string; micOn: boolean }) => {
      console.log(`Mic toggle: ${data.rollNumber} -> ${data.micOn}`);
      const peer = studentPeers.get(data.rollNumber);
      if (peer) {
        io.to(peer.socketId).emit("mic-control", {
          rollNumber: data.rollNumber,
          micOn: data.micOn,
        });
      }
    });

    socket.on("webrtc-offer", (data: { offer: RTCSessionDescriptionInit; rollNumber: string; roomToken: string }) => {
      console.log(`WebRTC offer from ${data.rollNumber}`);
      const teacherSocketId = teacherSockets.get(data.roomToken);
      if (teacherSocketId) {
        io.to(teacherSocketId).emit("webrtc-offer", data);
      }
    });

    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; roomToken: string; rollNumber: string }) => {
      console.log(`WebRTC answer for ${data.rollNumber}`);
      const peer = studentPeers.get(data.rollNumber);
      if (peer) {
        io.to(peer.socketId).emit("webrtc-answer", {
          answer: data.answer,
          rollNumber: data.rollNumber,
        });
      }
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; roomToken: string; rollNumber: string; from: string }) => {
      if (data.from === "student") {
        const teacherSocketId = teacherSockets.get(data.roomToken);
        if (teacherSocketId) io.to(teacherSocketId).emit("webrtc-ice", data);
      } else {
        const peer = studentPeers.get(data.rollNumber);
        if (peer) io.to(peer.socketId).emit("webrtc-ice", data);
      }
    });

    socket.on("disconnect", () => {
      teacherSockets.forEach((socketId, token) => {
        if (socketId === socket.id) teacherSockets.delete(token);
      });
      studentPeers.forEach((data, rollNumber) => {
        if (data.socketId === socket.id) studentPeers.delete(rollNumber);
      });
      console.log("Disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
  });
});