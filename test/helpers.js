import { request as httpRequest } from "http";

export function request(baseUrl, path, options = {}) {
  const url = new URL(path, baseUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, {
      method: options.method || "GET",
      headers: options.headers || {},
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.on("error", reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
}

export async function runTests(tests) {
  let failed = 0;
  for (const [name, test] of tests) {
    try {
      await test();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(error);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log(`\n${tests.length} tests passed`);
}
