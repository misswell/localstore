const MAX_BODY_SIZE = 10 * 1024 * 1024;

export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

export function send(response, status, body = "", headers = {}) {
  response.writeHead(status, { ...corsHeaders, ...headers });
  response.end(body);
}

export function sendJson(response, status, value) {
  send(response, status, JSON.stringify(value), {
    "content-type": "application/json; charset=utf-8",
  });
}

export async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      const error = new Error("Request body exceeds the 10 MB limit");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function parseRoute(rawUrl) {
  const url = new URL(rawUrl, "http://localhost");
  const match = url.pathname.match(/^\/(set|get|remove)\/(.+)$/);
  if (match) {
    try {
      return { action: match[1], key: decodeURIComponent(match[2]) };
    } catch {
      return { action: "invalid" };
    }
  }
  return { action: url.pathname.slice(1) || "root" };
}
