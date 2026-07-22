import assertModule from "assert";
import { join } from "path";
import { RequestLog } from "../src/request-log.js";

const assert = assertModule.strict;

export function requestLogCases(directory) {
  return [
    ["persists request history across instances", async () => {
      const file = join(directory, "request-history.json");
      const first = new RequestLog(file);
      await first.add({
        timestamp: "2026-07-22T01:00:00.000Z",
        method: "POST",
        path: "/set/example",
        status: 200,
        durationMs: 4,
        origin: null,
        address: "127.0.0.1",
      });

      const second = new RequestLog(file);
      await second.load();
      assert.equal(second.list().length, 1);
      assert.equal(second.list()[0].path, "/set/example");
    }],
  ];
}
