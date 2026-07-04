const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: {
      type: String,
      enum: ["login", "signup", "message_sent", "image_uploaded", "voice_used"],
      required: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
