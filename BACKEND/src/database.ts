import { Database } from "arangojs";
import dotenv from "dotenv";
import { BasicAuthCredentials } from "arangojs/connection";

// load .env file
dotenv.config();

const defaultDatabaseName = process.env.ARANGO_DB_NAME;

/** Create a database client, defaulting to ARANGO_DB_NAME when not provided. */
export function createDb(databaseName?: string) {
  return new Database({
    url: process.env.ARANGO_URL,
    databaseName: databaseName ?? defaultDatabaseName,
    auth: <BasicAuthCredentials>{
      username: process.env.ARANGO_USER,
      password: process.env.ARANGO_PASS,
    },
  });
}

// Establish default connection to database (env-based)
const db = createDb();

// function to test database connection
export async function connectArango(databaseName?: string) {
  const targetDb = databaseName ? createDb(databaseName) : db;
  try {
    console.log(process.env.ARANGO_URL);
    const info = await targetDb.version();
    console.log("Connected to database, version: ", info.version);
  } catch (err) {
    console.error("Failed to connect to database. Error: ", err);
    process.exit(1);
  }
}

export { db };
