import assertModule from "assert";
import { createLocalStoreServer } from "../src/app.js";
import { RequestLog } from "../src/request-log.js";
import { Storage } from "../src/storage.js";
import { request } from "./helpers.js";

const assert = assertModule.strict;

export async function apiCases(dataFile) {
  const storage = new Storage(dataFile);
  const requestLog = new RequestLog(`${dataFile}.requests`);
  await storage.load();
  await requestLog.load();
  const server = createLocalStoreServer(storage, requestLog);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const cases = [
    ["stores and retrieves text", async () => {
      const saved = await request(baseUrl, "/mock/greeting", {
        method: "POST",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: "你好，localstore",
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.headers["access-control-allow-origin"], "*");

      const loaded = await request(baseUrl, "/mock/greeting");
      assert.equal(loaded.status, 200);
      assert.equal(loaded.headers["content-type"], "text/plain; charset=utf-8");
      assert.equal(loaded.body, "你好，localstore");
    }],
    ["preserves JSON and URL-encoded keys", async () => {
      const value = JSON.stringify({ enabled: true, count: 3 });
      await request(baseUrl, `/mock/${encodeURIComponent("user settings")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: value,
      });
      const loaded = await request(baseUrl, `/mock/${encodeURIComponent("user settings")}`);
      assert.deepEqual(JSON.parse(loaded.body), JSON.parse(value));
    }],
    ["answers CORS preflight", async () => {
      const response = await request(baseUrl, "/mock/key", { method: "OPTIONS" });
      assert.equal(response.status, 204);
      assert.equal(response.headers["access-control-allow-origin"], "*");
      assert.match(response.headers["access-control-allow-methods"], /POST/);
    }],
    ["allows credentialed cross-origin preflight", async () => {
      const response = await request(baseUrl, "/mock/key", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:8004",
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization,content-type,x-app-id",
        },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers["access-control-allow-origin"], "http://localhost:8004");
      assert.equal(response.headers["access-control-allow-credentials"], "true");
      assert.equal(
        response.headers["access-control-allow-headers"],
        "authorization,content-type,x-app-id",
      );
      assert.match(response.headers.vary, /Origin/);
    }],
    ["returns caller-defined success and error response templates", async () => {
      const key = encodeURIComponent("rate limit");
      const configured = await request(baseUrl, `/mock/${key}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: {
            status: 201,
            headers: { "x-response-case": "success" },
            body: { ok: true, data: { remaining: 9 } },
          },
          error: {
            status: 429,
            headers: { "content-type": "application/json", "x-response-case": "error" },
            body: { ok: false, message: "rate limited" },
          },
        }),
      });
      assert.equal(configured.status, 200);
      assert.deepEqual(JSON.parse(configured.body).responses, ["success", "error"]);

      const success = await request(baseUrl, `/mock/${key}?response=success`);
      assert.equal(success.status, 201);
      assert.equal(success.headers["content-type"], "application/json; charset=utf-8");
      assert.equal(success.headers["x-response-case"], "success");
      assert.deepEqual(JSON.parse(success.body), { ok: true, data: { remaining: 9 } });

      const error = await request(baseUrl, `/mock/${key}?response=error`);
      assert.equal(error.status, 429);
      assert.equal(error.headers["x-response-case"], "error");
      assert.deepEqual(JSON.parse(error.body), { ok: false, message: "rate limited" });
    }],
    ["rejects unknown response cases", async () => {
      const response = await request(baseUrl, "/mock/greeting?response=preview");
      assert.equal(response.status, 400);
      assert.equal(JSON.parse(response.body).error, "Invalid response case");
    }],
    ["rejects response statuses that cannot carry a body", async () => {
      const response = await request(baseUrl, "/mock/invalid-status/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          success: { status: 204, body: { ignored: true } },
        }),
      });
      assert.equal(response.status, 400);
      assert.match(JSON.parse(response.body).error, /excluding 204/);
    }],
    ["returns 404 for missing keys", async () => {
      const response = await request(baseUrl, "/mock/missing?token=must-not-be-logged");
      assert.equal(response.status, 404);
      assert.equal(JSON.parse(response.body).error, "Key not found");
    }],
    ["deletes values through the unified mock path", async () => {
      await request(baseUrl, "/mock/delete-me", { method: "POST", body: "value" });
      const removed = await request(baseUrl, "/mock/delete-me", { method: "DELETE" });
      assert.equal(removed.status, 200);
      assert.equal((await request(baseUrl, "/mock/delete-me")).status, 404);
    }],
    ["does not expose the legacy set and get routes", async () => {
      assert.equal((await request(baseUrl, "/set/legacy", { method: "POST", body: "value" })).status, 404);
      assert.equal((await request(baseUrl, "/get/legacy")).status, 404);
    }],
    ["serves the request log dashboard", async () => {
      const response = await request(baseUrl, "/");
      assert.equal(response.status, 200);
      assert.match(response.headers["content-type"], /text\/html/);
      assert.match(response.body, /请求日志/);
      assert.match(response.body, /调用提示/);
      assert.match(response.body, /\/mock\/:key/);
    }],
    ["returns current request logs without logging dashboard polling", async () => {
      const first = await request(baseUrl, "/logs");
      const entries = JSON.parse(first.body);
      assert.ok(entries.some((entry) => entry.path === "/mock/greeting" && entry.status === 200));
      assert.ok(entries.some((entry) => entry.method === "OPTIONS"));
      assert.ok(entries.every((entry) => !entry.path.includes("must-not-be-logged")));
      const second = JSON.parse((await request(baseUrl, "/logs")).body);
      assert.equal(second.length, entries.length);
    }],
  ];

  return { cases, close: () => new Promise((resolve) => server.close(resolve)) };
}
