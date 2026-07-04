const express = require("express");
const router = express.Router();
const { authLimiter } = require("../middleware/rateLimiter");
const { protect } = require("../middleware/auth");
const {
  signup,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  logout,
  me,
} = require("../controllers/authController");

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleLogin);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/logout", logout);
router.get("/me", protect, me);

module.exports = router;
