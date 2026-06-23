const express = require("express");
const apiRouter = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { verifyToken, JWT_SECRET } = require("../middlewares/auth.middleware");

const ROLES = ["manager", "team_lead", "employee"];
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const sanitize = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
};

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

module.exports = function (app) {
  apiRouter.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, role, managerId } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ message: "username, email and password are required" });
      }

      if (username.trim().length < 3) {
        return res
          .status(400)
          .json({ message: "Username must be at least 3 characters" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const finalRole = ROLES.includes(role) ? role : "employee";

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }

      let manager = null;
      if (finalRole === "employee" && managerId) {
        const lead = await User.findById(managerId);
        if (lead && lead.role === "team_lead") manager = lead._id;
      }
      if (finalRole === "team_lead" && managerId) {
        const mgr = await User.findById(managerId);
        if (mgr && mgr.role === "manager") manager = mgr._id;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: finalRole,
        manager,
      });

      const token = signToken(user);
      return res.status(201).json({ token, user: sanitize(user) });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Registration failed", error: error.message });
    }
  });

  apiRouter.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "email and password are required" });
      }

      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken(user);
      return res.json({ token, user: sanitize(user) });
    } catch (error) {
      return res.status(500).json({ message: "Login failed", error: error.message });
    }
  });

  apiRouter.get("/api/auth/me", verifyToken, async (req, res) => {
    return res.json({ user: sanitize(req.user) });
  });

  apiRouter.get("/api/auth/public-users", async (req, res) => {
    try {
      const users = await User.find({
        role: { $in: ["manager", "team_lead"] },
      }).select("username role");
      return res.json({ users });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to load users", error: error.message });
    }
  });

  app.use("/", apiRouter);
};
