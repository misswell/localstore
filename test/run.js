import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { apiCases } from "./api-cases.js";
import { runTests } from "./helpers.js";
import { requestLogCases } from "./request-log-cases.js";
import { storageCases } from "./storage-cases.js";

const directory = await mkdtemp(join(tmpdir(), "localstore-test-"));

try {
  const api = await apiCases(join(directory, "api.json"));
  try {
    await runTests([...api.cases, ...storageCases(directory), ...requestLogCases(directory)]);
  } finally {
    await api.close();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
