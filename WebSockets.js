const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*", // Adjust for production!
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinTicket", (ticketId) => {
      socket.join(`ticket_${ticketId}`);
    });

    socket.on("newMessage", (data) => {
      // TODO: Save message to DB here (call your API or DB logic)
      io.to(`ticket_${data.ticketId}`).emit("messageReceived", data.message);
    });
  });

  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});