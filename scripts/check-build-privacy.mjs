import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root =
  process.env.AFTERBELL_LOCAL_DATA === "browser-tests" ? ".next-test" : ".next";
const privateFile = (name) =>
  /(?:^|[\\/])\.local[\\/]|(?:^|[\\/])\.env(?:\..*)?local$/.test(name);
function visit(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith(".nft.json")) {
      const trace = JSON.parse(readFileSync(file, "utf8"));
      // Next 16.4's exclusion matcher joins Windows backslashes without
      // normalizing them. Apply the same explicit private-data exclusions to
      // deployment manifests on both platforms, then verify the written result.
      const safe = trace.files.filter((name) => !privateFile(name));
      if (safe.length !== trace.files.length)
        writeFileSync(file, JSON.stringify({ ...trace, files: safe }));
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (saved.files.some(privateFile))
        throw new Error(
          `Private local data entered the deployment trace: ${file}`,
        );
    }
  }
}
visit(path.join(root, "server"));
console.log(
  "Build privacy check passed: local account/test data and private env files are excluded.",
);
