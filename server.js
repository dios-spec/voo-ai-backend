require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Message = require("./models/Message");
const Analytics = require("./models/Analytics");
const { streamChatCompletion } = require("./lib/aiProvider");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

io.use(async (socket, next) => {
  try {
    let token;
    const rawCookie = socket.handshake.headers?.cookie;
    if (rawCookie) token = cookie.parse(rawCookie).voo_token;
    if (!token) token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Not authenticated."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return next(new Error("Session invalid."));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Session expired. Please log in again."));
  }
});

io.on("connection", (socket) => {
  socket.on("live:message", async ({ text, mode = "general", chatId, history = [] }) => {
    try {
      if (!text || !text.trim()) {
        return socket.emit("live:error", { error: "Empty message." });
      }

      let chat = chatId ? await Chat.findOne({ _id: chatId, user: socket.user._id }) : null;
      if (!chat) {
        chat = await Chat.create({ user: socket.user._id, mode, title: text.slice(0, 60) });
      }
      const liveChatId = chat._id.toString();
      socket.emit("live:chat", { chatId: liveChatId });

      await Message.create({ chat: chat._id, role: "user", content: text });

      const conversation = [...history, { role: "user", content: text }];

      let full = "";
      await streamChatCompletion({
        history: conversation,
        mode,
        onToken: (token) => {
          full += token;
          socket.emit("live:token", token);
        },
      });

      await Message.create({ chat: chat._id, role: "assistant", content: full });
      chat.lastMessageAt = new Date();
      await chat.save();
      await Analytics.create({ user: socket.user._id, event: "voice_used" });

      socket.emit("live:done", { chatId: liveChatId });
    } catch (err) {
      console.error("live:message error:", err.message);
      socket.emit("live:error", { error: "Voo hit an error generating this response." });
    }
  });

  socket.on("disconnect", () => {});
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Voo AI backend running on port ${PORT}`));
