import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".tsx")) {
      const text = fs.readFileSync(file, "utf8");
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const edits = [];
      function visit(node) {
        if (ts.isJsxText(node) && node.getFullText(source).includes("'"))
          edits.push({
            start: node.pos,
            end: node.end,
            text: text.slice(node.pos, node.end).replaceAll("'", "’"),
          });
        ts.forEachChild(node, visit);
      }
      visit(source);
      let result = text;
      for (const e of edits.sort((a, b) => b.start - a.start))
        result = result.slice(0, e.start) + e.text + result.slice(e.end);
      fs.writeFileSync(file, result);
    }
  }
}
walk("src");
