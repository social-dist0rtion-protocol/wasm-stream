// @format
const pino = require("pino");

const { LOG_LEVEL, NODE_ENV } = process.env;
const logger = pino({
  level: LOG_LEVEL || "info",
  prettyPrint: NODE_ENV === "test"
});

module.exports = logger;
