module.exports = {
  apps: [
    {
      name: "Supperapp",
      script: "src/index.js",
      env: {
        SECRET_KEY: "kien0190902",
        NODE_ENV: "production",
        PORT: 5003
      }
    }
  ]
};