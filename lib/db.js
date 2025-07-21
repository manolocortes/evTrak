import mysql from "mysql2/promise";

let connection;
export const createConnection = async () => {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "evTrak_testing",
      port: Number.parseInt(process.env.DB_PORT || "3306"),
    });
  }
  return connection;
};
