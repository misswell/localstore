import { createServer } from "http";
import { dashboardAssets } from "./dashboard.js";
import { parseRoute, readBody, send, sendJson } from "./http.js";
import { attachRequestLogger } from "./request-log.js";

export function createLocalStoreServer(storage, requestLog) {
  return createServer(async (request, response) => {
    attachRequestLogger(request, response, requestLog);
    try {
      if (request.method === "OPTIONS") return send(response, 204);

      const route = parseRoute(request.url);

      if (request.method === "GET" && dashboardAssets[route.action]) {
        const asset = dashboardAssets[route.action];
        return send(response, 200, asset.body, { "content-type": asset.contentType });
      }

      if (request.method === "GET" && route.action === "logs") {
        return sendJson(response, 200, requestLog ? requestLog.list() : []);
      }

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
