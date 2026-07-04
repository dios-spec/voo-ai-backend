const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { chatLimiter } = require("../middleware/rateLimiter");
const {
  createChat,
  listChats,
  getChat,
  addMessage,
  deleteChat,
} = require("../controllers/chatController");

router.use(protect);

router.post("/", createChat);
router.get("/", listChats);
router.get("/:id", getChat);
router.post("/:id/messages", chatLimiter, addMessage);
router.delete("/:id", deleteChat);

module.exports = router;
