const express = require("express");
const apiRouter = express.Router();
const User = require("../models/user.model");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const {
  getVisibleUsers,
  getAssignableUsers,
} = require("../helpers/scope.helper");

module.exports = function (app) {
  apiRouter.get("/api/users", verifyToken, async (req, res) => {
    try {
      const users = await getVisibleUsers(req.user);
      return res.json({ users });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to load users", error: error.message });
    }
  });

  apiRouter.get("/api/users/assignable", verifyToken, async (req, res) => {
    try {
      const users = await getAssignableUsers(req.user);
      return res.json({ users });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to load users", error: error.message });
    }
  });

  apiRouter.get(
    "/api/users/team-leads",
    verifyToken,
    authorizeRoles("manager"),
    async (req, res) => {
      try {
        const users = await User.find({ role: "team_lead" }).sort({
          username: 1,
        });
        return res.json({ users });
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Failed to load team leads", error: error.message });
      }
    }
  );

  app.use("/", apiRouter);
};
