const Tesseract = require("tesseract.js");
const cloudinary = require("../config/cloudinary");
const { analyzeImage } = require("../lib/aiProvider");
const Analytics = require("../models/Analytics");

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/upload/image  (multipart/form-data, field: "image")
// Uploads to Cloudinary, runs OCR, then asks the AI provider to analyze the
// image (grounded with any OCR text found). Returns everything the chat UI
// needs to render + persist the message in one round trip.
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided (field name: image)." });
    }

    const question = req.body.question || "";

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      `voo-ai/${req.user._id}`
    );

    let ocrText = "";
    try {
      const ocrResult = await Tesseract.recognize(req.file.buffer, "eng");
      ocrText = (ocrResult.data.text || "").trim();
    } catch (ocrErr) {
      console.error("OCR failed, continuing without it:", ocrErr.message);
    }

    let analysis = "";
    try {
      analysis = await analyzeImage({
        imageUrl: cloudinaryResult.secure_url,
        ocrText,
        question,
      });
    } catch (aiErr) {
      console.error("Image analysis failed:", aiErr.message);
      analysis = ocrText
        ? `I couldn't fully analyze the image, but here's the text I found:\n\n${ocrText}`
        : "I couldn't analyze this image right now. Please try again.";
    }

    await Analytics.create({ user: req.user._id, event: "image_uploaded" });

    res.status(201).json({
      imageUrl: cloudinaryResult.secure_url,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      ocrText,
      analysis,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImage };
