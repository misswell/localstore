import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname } from "path";

export class Storage {
  constructor(filePath) {
    this.filePath = filePath;
    this.items = new Map();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    try {
      const data = JSON.parse(await readFile(this.filePath, "utf8"));
      this.items = new Map(Object.entries(data));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  get(key) {
    return this.items.get(key);
  }

  keys() {
    return [...this.items.keys()];
  }

  async set(key, value, contentType) {
    const existing = this.items.get(key);
    this.items.set(key, {
      value,
      contentType,
      ...(existing?.responses ? { responses: existing.responses } : {}),
    });
    await this.persist();
  }

  async setResponses(key, responses) {
    const existing = this.items.get(key) || {
      value: "",
      contentType: "text/plain; charset=utf-8",
    };
    this.items.set(key, { ...existing, responses });
    await this.persist();
  }

  async remove(key) {
    const removed = this.items.delete(key);
    if (removed) await this.persist();
    return removed;
  }

  async clear() {
    this.items.clear();
    await this.persist();
  }

  persist() {
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      const data = Object.fromEntries(this.items);
      await writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
      await rename(temporaryPath, this.filePath);
    });
    return this.writeQueue;
  }
}
