const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const { notFound, errorHandler } = require("./src/middlewares/error.middleware");
const { getCorsOptions, logAllowedOrigins } = require("./src/config/cors.config");

const app = express();

logAllowedOrigins();
app.use(cors(getCorsOptions()));

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);

require("./src/config/socket.config")(server, app);
app.use(require("./src/middlewares/io.middleware")(app));

require("./src/config/db.config")();
require("./src/routes")(app);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
