const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Analytics = require("../models/Analytics");

// POST /api/chats  { mode }
async function createChat(req, res, next) {
  try {
    const { mode = "general" } = req.body;
    const chat = await Chat.create({ user: req.user._id, mode });
    res.status(201).json({ chat });
  } catch (err) {
    next(err);
  }
}

// GET /api/chats  (history list, newest first, optional ?q= search)
async function listChats(req, res, next) {
  try {
    const { q } = req.query;
    const filter = { user: req.user._id };
    if (q) filter.title = { $regex: q, $options: "i" };

    const chats = await Chat.find(filter).sort({ lastMessageAt: -1 }).limit(100);
    res.json({ chats });
  } catch (err) {
    next(err);
  }
}

// GET /api/chats/:id  (with messages)
async function getChat(req, res, next) {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });
    res.json({ chat, messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/chats/:id/messages  { role, content, imageUrl }
// Persists a message. AI streaming itself stays on the Next.js edge route;
// the frontend calls this after a turn completes to save it.
async function addMessage(req, res, next) {
  try {
    const { role, content, imageUrl } = req.body;
    if (!["user", "assistant"].includes(role) || !content) {
      return res.status(400).json({ error: "role ('user'|'assistant') and content are required." });
    }

    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const message = await Message.create({ chat: chat._id, role, content, imageUrl });

    chat.lastMessageAt = new Date();
    if (chat.title === "New chat" && role === "user") {
      chat.title = content.slice(0, 60);
    }
    await chat.save();

    if (role === "user") {
      await Analytics.create({
        user: req.user._id,
        event: imageUrl ? "image_uploaded" : "message_sent",
      });
    }

    res.status(201).json({ message, chat });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/chats/:id
async function deleteChat(req, res, next) {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    await Message.deleteMany({ chat: chat._id });
    res.json({ message: "Chat deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { createChat, listChats, getChat, addMessage, deleteChat };
