module.exports = {
  apps: [
    {
      name: "tn-claims-backend",
      script: "./server/index.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DB_HOST: "localhost",
        DB_PORT: 3306,
        DB_USER: "root",
        DB_PASSWORD: "my1p@ssw0rd",
        DB_NAME: "tn_claims",
        JWT_SECRET: "supersecretjwtkey123!@#"
      }
    },
    {
      name: "tn-claims-frontend",
      script: "./node_modules/vite/bin/vite.js",
      args: "preview",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
