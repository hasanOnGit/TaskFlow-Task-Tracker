const express = require("express");
const apiRouter = express.Router();
const Task = require("../models/task.model");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getAssignableUserIds,
  canModifyTask,
} = require("../helpers/scope.helper");

const TASK_STATUS = ["pending", "completed"];

function withRefs(query) {
  return query
    .populate("assignedTo", "username email role")
    .populate("createdBy", "username email role");
}

module.exports = function (app) {
  apiRouter.get("/api/tasks", verifyToken, async (req, res) => {
    try {
      const { status } = req.query;
      const filter = {};

      if (status && TASK_STATUS.includes(status)) {
        filter.status = status;
      }

      if (req.user.role !== "manager") {
        const ids = await getAssignableUserIds(req.user);
        filter.$or = [{ assignedTo: { $in: ids } }, { createdBy: { $in: ids } }];
      }

      const tasks = await withRefs(Task.find(filter).sort({ updatedAt: -1 }));
      return res.json({ tasks });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to load tasks", error: error.message });
    }
  });

  apiRouter.post("/api/tasks", verifyToken, async (req, res) => {
    try {
      const { title, description, status, assignedTo } = req.body;

      if (!title || title.trim().length < 3) {
        return res
          .status(400)
          .json({ message: "Title must be at least 3 characters" });
      }

      let assignee = req.user._id.toString();
      if (req.user.role !== "employee" && assignedTo) {
        const allowed = await getAssignableUserIds(req.user);
        if (!allowed.includes(assignedTo.toString())) {
          return res
            .status(403)
            .json({ message: "You cannot assign tasks to this user" });
        }
        assignee = assignedTo;
      }

      const created = await Task.create({
        title,
        description: description || "",
        status: TASK_STATUS.includes(status) ? status : "pending",
        assignedTo: assignee,
        createdBy: req.user._id,
      });

      const task = await withRefs(Task.findById(created._id));

      req.io.emit("task:created", task);
      return res.status(201).json({ task });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to create task", error: error.message });
    }
  });

  apiRouter.put("/api/tasks/:id", verifyToken, async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!(await canModifyTask(req.user, task))) {
        return res.status(403).json({ message: "You cannot modify this task" });
      }

      const { title, description, status, assignedTo } = req.body;

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined && TASK_STATUS.includes(status)) {
        task.status = status;
      }

      if (assignedTo !== undefined && req.user.role !== "employee") {
        const allowed = await getAssignableUserIds(req.user);
        if (!allowed.includes(assignedTo.toString())) {
          return res
            .status(403)
            .json({ message: "You cannot assign tasks to this user" });
        }
        task.assignedTo = assignedTo;
      }

      await task.save();
      const updated = await withRefs(Task.findById(task._id));

      req.io.emit("task:updated", updated);
      return res.json({ task: updated });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to update task", error: error.message });
    }
  });

  apiRouter.delete("/api/tasks/:id", verifyToken, async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!(await canModifyTask(req.user, task))) {
        return res.status(403).json({ message: "You cannot delete this task" });
      }

      if (req.user.role === "employee") {
        return res
          .status(403)
          .json({ message: "Employees cannot delete tasks" });
      }

      await task.deleteOne();

      req.io.emit("task:deleted", { _id: task._id });
      return res.json({ message: "Task deleted", _id: task._id });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to delete task", error: error.message });
    }
  });

  app.use("/", apiRouter);
};
