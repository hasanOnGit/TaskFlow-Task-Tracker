const User = require("../models/user.model");

async function getAssignableUserIds(user) {
  if (user.role === "manager") {
    const all = await User.find().select("_id");
    return all.map((u) => u._id.toString());
  }
  if (user.role === "team_lead") {
    const members = await User.find({ manager: user._id }).select("_id");
    return [user._id.toString(), ...members.map((m) => m._id.toString())];
  }
  return [user._id.toString()];
}

async function getVisibleUsers(user) {
  if (user.role === "manager") {
    return User.find().sort({ role: 1, username: 1 });
  }
  if (user.role === "team_lead") {
    const members = await User.find({ manager: user._id }).sort({ username: 1 });
    const self = await User.findById(user._id);
    return [self, ...members];
  }
  return [await User.findById(user._id)];
}

async function getAssignableUsers(user) {
  if (user.role === "manager") {
    return User.find().sort({ username: 1 });
  }
  if (user.role === "team_lead") {
    const members = await User.find({ manager: user._id }).sort({ username: 1 });
    return [await User.findById(user._id), ...members];
  }
  return [await User.findById(user._id)];
}

async function canModifyTask(user, task) {
  if (user.role === "manager") return true;
  const ids = await getAssignableUserIds(user);
  return (
    ids.includes(task.assignedTo.toString()) ||
    ids.includes(task.createdBy.toString())
  );
}

module.exports = {
  getAssignableUserIds,
  getVisibleUsers,
  getAssignableUsers,
  canModifyTask,
};
