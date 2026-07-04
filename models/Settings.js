const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    voice: { type: String, default: "default" },
    language: { type: String, default: "en-US" },
    aiModel: { type: String, default: "llama-3.3-70b-versatile" },
    aiProvider: { type: String, enum: ["groq", "claude", "gemini"], default: "groq" },
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
