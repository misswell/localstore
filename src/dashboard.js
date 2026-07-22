import { readFileSync } from "fs";

const files = {
  root: ["dashboard.html", "text/html; charset=utf-8"],
  "dashboard.css": ["dashboard.css", "text/css; charset=utf-8"],
  "dashboard.js": ["dashboard-client.js", "text/javascript; charset=utf-8"],
};

export const dashboardAssets = Object.fromEntries(
  Object.entries(files).map(([route, [file, contentType]]) => [
    route,
    {
      body: readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
      contentType,
    },
  ]),
);
