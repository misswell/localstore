import { createServer } from "http";
import { dashboardAssets } from "./dashboard.js";
import { parseRoute, readBody, send, sendJson } from "./http.js";
import { attachRequestLogger } from "./request-log.js";

export function createLocalStoreServer(storage, requestLog) {
  return createServer(async (request, response) => {
    attachRequestLogger(request, response, requestLog);
    const corsOptions = {
      origin: request.headers.origin,
      requestedHeaders: request.headers["access-control-request-headers"],
    };
    const sendResponse = (status, body = "", headers = {}) =>
      send(response, status, body, headers, corsOptions);
    const sendJsonResponse = (status, value) =>
      sendJson(response, status, value, corsOptions);

    try {
      if (request.method === "OPTIONS") return sendResponse(204);

      const route = parseRoute(request.url);

      if (request.method === "GET" && dashboardAssets[route.action]) {
        const asset = dashboardAssets[route.action];
        return sendResponse(200, asset.body, { "content-type": asset.contentType });
      }

      if (request.method === "GET" && route.action === "logs") {
        return sendJsonResponse(200, requestLog ? requestLog.list() : []);
      }

      if (request.method === "POST" && route.action === "mock") {
        const value = await readBody(request);
        const contentType = request.headers["content-type"] || "text/plain; charset=utf-8";
        await storage.set(route.key, value, contentType);
        return sendJsonResponse(200, { ok: true, key: route.key });
      }

      if (request.method === "GET" && route.action === "mock") {
        const item = storage.get(route.key);
        if (!item) return sendJsonResponse(404, { error: "Key not found", key: route.key });
        return sendResponse(200, item.value, { "content-type": item.contentType });
      }

      if (request.method === "DELETE" && route.action === "mock") {
        const removed = await storage.remove(route.key);
        return sendJsonResponse(removed ? 200 : 404, { ok: removed, key: route.key });
      }

      if (request.method === "GET" && route.action === "keys") {
        return sendJsonResponse(200, storage.keys());
      }

      if (request.method === "POST" && route.action === "clear") {
        await storage.clear();
        return sendJsonResponse(200, { ok: true });
      }

      if (route.action === "invalid") {
        return sendJsonResponse(400, { error: "Invalid URL-encoded key" });
      }
      return sendJsonResponse(404, { error: "Route not found" });
    } catch (error) {
      console.error(error);
      return sendJsonResponse(error.statusCode || 500, { error: error.message || "Internal server error" });
    }
  });
}
