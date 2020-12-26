// @format

module.exports = {
  apps: [
    {
      name: "server",
      script: "./src/server.js",
      watch: true,
      env: {
        NODE_ENV: "production"
      },
      time: true
    }
  ]
};
