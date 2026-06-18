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

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    // Teacher joins room
    socket.on("teacher-join", (roomToken: string) => {
      socket.join(`room:${roomToken}`);
      console.log(`Teacher joined room:${roomToken}`);
    });

    // Student joins room
    socket.on("student-join", (data: { roomToken: string; rollNumber: string }) => {
      socket.join(`room:${data.roomToken}`);
      socket.data.rollNumber = data.rollNumber;
      socket.data.roomToken = data.roomToken;
      console.log(`Student ${data.rollNumber} joined room:${data.roomToken}`);
    });

    // Teacher toggles student mic
    socket.on("toggle-mic", (data: { roomToken: string; rollNumber: string; micOn: boolean }) => {
      io.to(`room:${data.roomToken}`).emit("mic-control", {
        rollNumber: data.rollNumber,
        micOn: data.micOn,
      });
    });

    // WebRTC Signaling
    socket.on("webrtc-offer", (data: { offer: RTCSessionDescriptionInit; rollNumber: string; roomToken: string }) => {
      socket.to(`room:${data.roomToken}`).emit("webrtc-offer", data);
    });

    socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; roomToken: string }) => {
      socket.to(`room:${data.roomToken}`).emit("webrtc-answer", data);
    });

    socket.on("webrtc-ice", (data: { candidate: RTCIceCandidateInit; roomToken: string }) => {
      socket.to(`room:${data.roomToken}`).emit("webrtc-ice", data);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
  });
});
