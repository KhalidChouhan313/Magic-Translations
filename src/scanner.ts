import fs from "fs-extra";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

const SKIP_FOLDERS = ["node_modules", "dist", ".git", "translations"];

export async function scanProject(cwd: string): Promise<string[]> {
    const allTexts: string[] = [];
    const files = await getAllFiles(cwd);

    for (const file of files) {
        const texts = await scanFile(file);
        allTexts.push(...texts);
    }

    const unique = [...new Set(allTexts)];
    return unique;
}

async function getAllFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
        if (SKIP_FOLDERS.includes(item)) continue;

        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            const nested = await getAllFiles(fullPath);
            results.push(...nested);
        } else if (EXTENSIONS.includes(path.extname(item))) {
            results.push(fullPath);
        }
    }

    return results;
}

async function scanFile(filePath: string): Promise<string[]> {
    const texts: string[] = [];

    try {
        const code = await fs.readFile(filePath, "utf-8");

        const ast = parser.parse(code, {
            sourceType: "module",
            plugins: ["jsx", "typescript"],
        });

        traverse(ast, {
            JSXText(nodePath) {
                const text = nodePath.node.value.trim();
                if (text.length > 1) {
                    texts.push(text);
                }
            },

            StringLiteral(nodePath) {
                const text = nodePath.node.value.trim();

                if (text.length < 2) return;

                const parent = nodePath.parent;
                if (parent.type === "CallExpression") return;

                if (text.includes("/") || text.includes("\\")) return;

                texts.push(text);
            },
        });
    } catch (err) {
    }

    return texts;
}