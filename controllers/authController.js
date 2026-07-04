const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Settings = require("../models/Settings");
const Analytics = require("../models/Analytics");
const { sendPasswordResetEmail } = require("../lib/email");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Frontend (Vercel) and backend (Render/Railway) live on different domains,
// so the auth cookie must be SameSite=None + Secure in production for the
// browser to attach it to cross-site fetch() calls. Locally (http, same
// machine) SameSite=Lax + non-secure keeps things working over plain http.
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

function sendTokenCookie(res, token) {
  res.cookie("voo_token", token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are all required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = await User.create({ name, email, password });
    await Settings.create({ user: user._id });
    await Analytics.create({ user: user._id, event: "signup" });

    const token = signToken(user._id);
    sendTokenCookie(res, token);
    res.status(201).json({ user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    user.lastLoginAt = new Date();
    await user.save();
    await Analytics.create({ user: user._id, event: "login" });

    const token = signToken(user._id);
    sendTokenCookie(res, token);
    res.json({ user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google
async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing Google idToken." });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        avatarUrl: payload.picture,
      });
      await Settings.create({ user: user._id });
      await Analytics.create({ user: user._id, event: "signup" });
    }

    user.lastLoginAt = new Date();
    await user.save();
    await Analytics.create({ user: user._id, event: "login" });

    const token = signToken(user._id);
    sendTokenCookie(res, token);
    res.json({ user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always respond success — never reveal whether an email exists.
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    try {
      await sendPasswordResetEmail({ to: user.email, resetToken: rawToken });
    } catch (emailErr) {
      // Don't leak provider/delivery failures to the client — that would let
      // an attacker distinguish "no account" from "account, email failed".
      // Log for ops and still return the generic success message below.
      console.error(`[forgotPassword] failed to send reset email to ${user.email}:`, emailErr);
    }

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Valid token and a 6+ character password are required." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired." });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie("voo_token", COOKIE_OPTIONS);
  res.json({ message: "Logged out." });
}

// GET /api/auth/me
function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

module.exports = { signup, login, googleLogin, forgotPassword, resetPassword, logout, me };
