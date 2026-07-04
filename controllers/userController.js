const User = require("../models/User");
const Settings = require("../models/Settings");
const Chat = require("../models/Chat");
const Analytics = require("../models/Analytics");

// GET /api/users/settings
async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne({ user: req.user._id });
    if (!settings) settings = await Settings.create({ user: req.user._id });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/settings
async function updateSettings(req, res, next) {
  try {
    const allowed = ["theme", "voice", "language", "aiModel", "aiProvider", "notificationsEnabled"];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/profile  { name, avatarUrl }
async function updateProfile(req, res, next) {
  try {
    const { name, avatarUrl } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/admin/stats  (admin only)
async function adminStats(req, res, next) {
  try {
    const [totalUsers, activeToday, totalChats, eventsLast7Days] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Chat.countDocuments(),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: "$event", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ totalUsers, activeToday, totalChats, eventsLast7Days });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, updateProfile, adminStats };
