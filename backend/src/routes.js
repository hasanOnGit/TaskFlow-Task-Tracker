module.exports = function (app) {
  require("./controllers/auth.controller")(app);
  require("./controllers/user.controller")(app);
  require("./controllers/task.controller")(app);
};
