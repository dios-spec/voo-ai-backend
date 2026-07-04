const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat" },
    mode: {
      type: String,
      enum: ["general", "study", "coding", "math", "science"],
      default: "general",
    },
    isPinned: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

chatSchema.index({ user: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
