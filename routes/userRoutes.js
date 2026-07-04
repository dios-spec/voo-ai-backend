const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getSettings,
  updateSettings,
  updateProfile,
  adminStats,
} = require("../controllers/userController");

router.use(protect);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.patch("/profile", updateProfile);
router.get("/admin/stats", adminOnly, adminStats);

module.exports = router;
