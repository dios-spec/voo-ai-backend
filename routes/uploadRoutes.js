const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { chatLimiter } = require("../middleware/rateLimiter");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");

router.post("/image", protect, chatLimiter, upload.single("image"), uploadImage);

module.exports = router;
