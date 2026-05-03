import fs from "fs-extra";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const SKIP_FOLDERS = ["node_modules", "dist", ".git", "translations", "public"];

function shouldSkip(text: string): boolean {
    if (text.length <= 2) return true;
    if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(text)) return true;
    if (text.includes("/") || text.includes("\\")) return true;
    if (/^[a-z][a-z0-9]*$/.test(text)) return true;
    if (/^[a-z][a-zA-Z0-9]+$/.test(text)) return true;
    if (/^[A-Z_0-9]+$/.test(text)) return true;
    if (/^\d+$/.test(text)) return true;
    if (text.startsWith("http") || text.startsWith("www")) return true;
    if (text.startsWith("_") || text.startsWith(".")) return true;
    if (text === "true" || text === "false") return true;
    if (text.startsWith("mt_")) return true;
    if (/#[0-9a-fA-F]{3,6}/.test(text)) return true;
    if (/^[A-Z][a-z]+[A-Z]/.test(text)) return true;
    return false;
}

export async function scanProject(cwd: string): Promise<string[]> {
    const allTexts: string[] = [];
    const files = await getAllFiles(cwd);

    for (const file of files) {
        const texts = await scanFile(file);
        allTexts.push(...texts);
    }

    return [...new Set(allTexts)];
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
                if (!shouldSkip(text)) {
                    texts.push(text);
                }
            },

            StringLiteral(nodePath) {
                const text = nodePath.node.value.trim();
                if (shouldSkip(text)) return;

                const parent = nodePath.parent;
                if (parent.type === "CallExpression") return;
                if (parent.type === "ImportDeclaration") return;
                if (parent.type === "ExportNamedDeclaration") return;
                if (parent.type === "ExportDefaultDeclaration") return;
                if (parent.type === "ObjectProperty") return;

                texts.push(text);
            },
        });
    } catch (err) { }

    return texts;
}