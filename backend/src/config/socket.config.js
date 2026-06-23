const { Server } = require("socket.io");
const { createCorsOriginChecker } = require("./cors.config");

module.exports = function (server, app) {
  const io = new Server(server, {
    cors: {
      origin: createCorsOriginChecker(),
      credentials: true,
    },
  });

  app.set("io", io);
  return io;
};
