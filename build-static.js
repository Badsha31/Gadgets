const fs = require("fs");
const path = require("path");

const root = __dirname;
const source = path.join(root, "public");
const out = path.join(root, "dist");

function copy(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dst, name));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of ["index.html", "cf.css", "cf-app.js", "site.json"]) {
  copy(path.join(source, name), path.join(out, name));
}

console.log("Static Cloudflare build ready:", out);
