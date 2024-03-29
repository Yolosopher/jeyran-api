module.exports = {
  apps: [
    {
      name: "Jeyran API",
      script: "node ./dist/index.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
