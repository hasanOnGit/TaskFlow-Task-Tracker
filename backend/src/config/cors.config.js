function normalizeOrigin(value) {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
}

function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:4200";
  return raw
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function isOriginAllowed(origin, allowed) {
  const normalized = normalizeOrigin(origin);

  if (allowed.includes(normalized)) {
    return true;
  }

  try {
    const host = new URL(normalized).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return allowed.some((entry) => {
        try {
          const allowedHost = new URL(entry).hostname;
          return allowedHost === host;
        } catch {
          return false;
        }
      });
    }
    if (host.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function createCorsOriginChecker() {
  const allowed = getAllowedOrigins();

  return function checkOrigin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (isOriginAllowed(origin, allowed)) {
      return callback(null, true);
    }

    console.warn("CORS blocked origin:", origin, "| allowed:", allowed.join(", "));
    return callback(null, false);
  };
}

function getCorsOptions() {
  return {
    origin: createCorsOriginChecker(),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

function logAllowedOrigins() {
  const allowed = getAllowedOrigins();
  console.log("CORS allowed origins:", allowed.join(", "));
  console.log("CORS also allows *.vercel.app preview URLs");
}

module.exports = {
  getAllowedOrigins,
  getCorsOptions,
  logAllowedOrigins,
};
