import { createServer } from "http";
import { parseRoute, readBody, send, sendJson } from "./http.js";

export function createLocalStoreServer(storage) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") return send(response, 204);

      const route = parseRoute(request.url);

      if (request.method === "POST" && route.action === "set") {
        const value = await readBody(request);
        const contentType = request.headers["content-type"] || "text/plain; charset=utf-8";
        await storage.set(route.key, value, contentType);
        return sendJson(response, 200, { ok: true, key: route.key });
      }

      if (request.method === "GET" && route.action === "get") {
        const item = storage.get(route.key);
        if (!item) return sendJson(response, 404, { error: "Key not found", key: route.key });
        return send(response, 200, item.value, { "content-type": item.contentType });
      }

      if (request.method === "DELETE" && route.action === "remove") {
        const removed = await storage.remove(route.key);
        return sendJson(response, removed ? 200 : 404, { ok: removed, key: route.key });
      }

      if (request.method === "GET" && route.action === "keys") {
        return sendJson(response, 200, storage.keys());
      }

      if (request.method === "POST" && route.action === "clear") {
        await storage.clear();
        return sendJson(response, 200, { ok: true });
      }

      if (request.method === "GET" && route.action === "root") {
        return sendJson(response, 200, {
          name: "localstore",
          endpoints: ["POST /set/:key", "GET /get/:key", "DELETE /remove/:key", "GET /keys", "POST /clear"],
        });
      }

      if (route.action === "invalid") {
        return sendJson(response, 400, { error: "Invalid URL-encoded key" });
      }
      return sendJson(response, 404, { error: "Route not found" });
    } catch (error) {
      console.error(error);
      return sendJson(response, error.statusCode || 500, { error: error.message || "Internal server error" });
    }
  });
}
