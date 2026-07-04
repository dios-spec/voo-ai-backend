const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, default: null },
    tokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
