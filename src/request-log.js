import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname } from "path";

const MAX_ENTRIES = 1000;

export class RequestLog {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = [];
    this.writeQueue = Promise.resolve();
  }

  async load() {
    try {
      const data = JSON.parse(await readFile(this.filePath, "utf8"));
      this.entries = Array.isArray(data) ? data.slice(-MAX_ENTRIES) : [];
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  list() {
    return [...this.entries].reverse();
  }

  async add(entry) {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    await this.persist();
  }

  persist() {
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(this.entries, null, 2), "utf8");
      await rename(temporaryPath, this.filePath);
    });
    return this.writeQueue;
  }
}

export function attachRequestLogger(request, response, requestLog) {
  if (!requestLog || !shouldLog(request)) return;
  const startedAt = Date.now();
  response.once("finish", () => {
    requestLog.add({
      timestamp: new Date(startedAt).toISOString(),
      method: request.method,
      path: new URL(request.url, "http://localhost").pathname,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      origin: request.headers.origin || null,
      address: request.socket.remoteAddress || null,
    }).catch((error) => console.error("Failed to persist request log", error));
  });
}

function shouldLog(request) {
  const path = new URL(request.url, "http://localhost").pathname;
  return !["/", "/logs", "/dashboard.css", "/dashboard.js"].includes(path);
}
