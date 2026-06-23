const { Server } = require("socket.io");

module.exports = function (server, app) {
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:4200";

  const io = new Server(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      credentials: true,
    },
  });

  app.set("io", io);
  return io;
};
