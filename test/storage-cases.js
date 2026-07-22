import assertModule from "assert";
import { writeFile } from "fs/promises";
import { join } from "path";
import { Storage } from "../src/storage.js";

const assert = assertModule.strict;

export function storageCases(directory) {
  return [
    ["persists values across instances", async () => {
      const file = join(directory, "persistence.json");
      const first = new Storage(file);
      await first.load();
      await first.set("session", "abc123", "text/plain");

      const second = new Storage(file);
      await second.load();
      assert.deepEqual(second.get("session"), {
        value: "abc123",
        contentType: "text/plain",
      });
    }],
    ["removes values and clears the store", async () => {
      const storage = new Storage(join(directory, "operations.json"));
      await storage.set("one", "1", "text/plain");
      await storage.set("two", "2", "text/plain");
      assert.deepEqual(storage.keys(), ["one", "two"]);
      assert.equal(await storage.remove("one"), true);
      assert.equal(await storage.remove("missing"), false);
      await storage.clear();
      assert.deepEqual(storage.keys(), []);
    }],
    ["recovers after a failed disk write", async () => {
      const invalidParent = join(directory, "not-a-directory");
      await writeFile(invalidParent, "file");
      const storage = new Storage(join(invalidParent, "data.json"));
      await assert.rejects(storage.set("first", "1", "text/plain"));

      storage.filePath = join(directory, "recovered.json");
      await storage.set("second", "2", "text/plain");

      const reloaded = new Storage(storage.filePath);
      await reloaded.load();
      assert.equal(reloaded.get("first").value, "1");
      assert.equal(reloaded.get("second").value, "2");
    }],
  ];
}
