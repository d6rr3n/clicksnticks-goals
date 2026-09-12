/**
 * Resolver hook for `node --test`, so tests can import app modules using the
 * same extensionless and "@/" specifiers the app uses. Test-only: the app
 * itself is resolved by Next.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "..", "src");
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(base) {
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = firstExisting(path.join(SRC, specifier.slice(2)));
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const parentPath = fileURLToPath(context.parentURL);
    const resolved = firstExisting(
      path.resolve(path.dirname(parentPath), specifier),
    );
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
