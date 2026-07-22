import assertModule from "assert";
import { createLocalStoreServer } from "../src/app.js";
import { Storage } from "../src/storage.js";
import { request } from "./helpers.js";

const assert = assertModule.strict;

export async function apiCases(dataFile) {
  const storage = new Storage(dataFile);
  await storage.load();
  const server = createLocalStoreServer(storage);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const cases = [
    ["stores and retrieves text", async () => {
      const saved = await request(baseUrl, "/set/greeting", {
        method: "POST",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: "你好，localstore",
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.headers["access-control-allow-origin"], "*");

      const loaded = await request(baseUrl, "/get/greeting");
      assert.equal(loaded.status, 200);
      assert.equal(loaded.headers["content-type"], "text/plain; charset=utf-8");
      assert.equal(loaded.body, "你好，localstore");
    }],
    ["preserves JSON and URL-encoded keys", async () => {
      const value = JSON.stringify({ enabled: true, count: 3 });
      await request(baseUrl, `/set/${encodeURIComponent("user settings")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: value,
      });
      const loaded = await request(baseUrl, `/get/${encodeURIComponent("user settings")}`);
      assert.deepEqual(JSON.parse(loaded.body), JSON.parse(value));
    }],
    ["answers CORS preflight", async () => {
      const response = await request(baseUrl, "/set/key", { method: "OPTIONS" });
      assert.equal(response.status, 204);
      assert.equal(response.headers["access-control-allow-origin"], "*");
      assert.match(response.headers["access-control-allow-methods"], /POST/);
    }],
    ["returns 404 for missing keys", async () => {
      const response = await request(baseUrl, "/get/missing");
      assert.equal(response.status, 404);
      assert.equal(JSON.parse(response.body).error, "Key not found");
    }],
  ];

  return { cases, close: () => new Promise((resolve) => server.close(resolve)) };
}
