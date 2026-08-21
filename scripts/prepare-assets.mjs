import { cp, mkdir, rm } from "node:fs/promises";

const output = new URL("../.site/", import.meta.url);
const root = new URL("../", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of ["index.html", "styles.css", "app.js", ".nojekyll"]) {
  await cp(new URL(name, root), new URL(name, output));
}
await cp(new URL("assets/", root), new URL("assets/", output), { recursive: true });
await cp(new URL("owner/", root), new URL("owner/", output), { recursive: true });

console.log("Prepared isolated Happy Tail public assets in .site/.");
