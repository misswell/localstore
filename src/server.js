import { resolve } from "path";
import { createLocalStoreServer } from "./app.js";
import { RequestLog } from "./request-log.js";
import { Storage } from "./storage.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 7777);
const dataFile = resolve(process.env.DATA_FILE || ".localstore/data.json");
const logFile = resolve(process.env.LOG_FILE || ".localstore/requests.json");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535");
  process.exit(1);
}

async function main() {
  if (dataFile === logFile) {
    throw new Error("DATA_FILE and LOG_FILE must use different paths");
  }
  const storage = new Storage(dataFile);
  const requestLog = new RequestLog(logFile);
  await storage.load();
  await requestLog.load();

  createLocalStoreServer(storage, requestLog).listen(port, host, () => {
    console.log(`localstore listening on http://${host}:${port}`);
    console.log(`data file: ${dataFile}`);
    console.log(`request log: ${logFile}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
