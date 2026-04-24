const { Sequelize } = require("sequelize");
const config = require("./config.json");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  process.env.DB_NAME || dbConfig.database,
  process.env.DB_USER || dbConfig.username,
  process.env.DB_PASSWORD || dbConfig.password,
  {
    host: process.env.DB_HOST || dbConfig.host,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    define: dbConfig.define,
    logging: env === "development" ? console.log : false, // log query hanya di dev
  }
);

module.exports = sequelize;
