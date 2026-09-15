const defaultStatus = {
  success: 200,
  error: 500,
};

export const responseCases = ["success", "error"];

export function parseResponseTemplates(rawBody) {
  let value;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw badRequest("Response templates must be valid JSON");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest("Response templates must be an object");
  }

  const templates = {};
  for (const responseCase of responseCases) {
    if (value[responseCase] !== undefined) {
      templates[responseCase] = normalizeTemplate(value[responseCase], responseCase);
    }
  }

  if (!Object.keys(templates).length) {
    throw badRequest("Response templates must define success or error");
  }
  return templates;
}

function normalizeTemplate(value, responseCase) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(responseCase + " response must be an object");
  }

  const status = value.status === undefined ? defaultStatus[responseCase] : value.status;
  if (
    !Number.isInteger(status)
    || status < 200
    || status > 599
    || [204, 205, 304].includes(status)
  ) {
    throw badRequest(
      responseCase + " response status must be a final status between 200 and 599, excluding 204, 205, and 304",
    );
  }

  const headers = normalizeHeaders(value.headers);
  const body = normalizeBody(value.body, headers);
  return { status, headers, body };
}

function normalizeHeaders(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest("Response headers must be an object");
  }

  const headers = {};
  for (const [name, headerValue] of Object.entries(value)) {
    if (!name || name.includes(":") || /\s/.test(name)) {
      throw badRequest("Invalid response header name: " + name);
    }
    if (typeof headerValue !== "string" && typeof headerValue !== "number") {
      throw badRequest("Response header value must be a string: " + name);
    }
    const normalizedValue = String(headerValue);
    if (normalizedValue.includes("\r") || normalizedValue.includes("\n")) {
      throw badRequest("Invalid response header value: " + name);
    }
    headers[name] = normalizedValue;
  }
  return headers;
}

function normalizeBody(value, headers) {
  if (value === undefined) {
    setDefaultContentType(headers, "text/plain; charset=utf-8");
    return "";
  }
  if (typeof value === "string") {
    setDefaultContentType(headers, "text/plain; charset=utf-8");
    return value;
  }

  setDefaultContentType(headers, "application/json; charset=utf-8");
  return JSON.stringify(value);
}

function setDefaultContentType(headers, value) {
  if (!Object.keys(headers).some((name) => name.toLowerCase() === "content-type")) {
    headers["content-type"] = value;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
