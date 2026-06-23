module.exports = function (app) {
  return (req, res, next) => {
    req.io = app.get("io");
    next();
  };
};
