import fs from "fs-extra";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const SKIP_FOLDERS = ["node_modules", "dist", ".git", "translations", "public"];

const TEXT_BEARING_ATTRS = new Set([
    "placeholder",
    "title",
    "alt",
    "aria-label",
    "aria-placeholder",
    "aria-description",
    "label",
    "tooltip",
    "content",
]);

function shouldSkip(text: string): boolean {
    const t = text.trim();

    if (t.length <= 2) return true;

    if (/^\d+$/.test(t)) return true;

    if (t.startsWith("http") || t.startsWith("www")) return true;
    if (t.includes("/") || t.includes("\\")) return true;
    if (/^[._@#]/.test(t)) return true;

    if (t === "true" || t === "false") return true;

    if (t.startsWith("mt_")) return true;

    if (/#[0-9a-fA-F]{3,8}/.test(t)) return true;

    if (/^[A-Z_][A-Z0-9_]+$/.test(t)) return true;

    if (/^[a-z][a-zA-Z0-9]+$/.test(t)) return true;

    if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(t)) return true;

    if (/^[a-z]+$/.test(t)) return true;

    if (/^[A-Z][a-z]+([A-Z][a-z]*)+$/.test(t)) return true;

    if (t.includes(" ")) {
        const tokens = t.split(/\s+/);
        const cssLike = tokens.filter((tok) =>
            /^[a-z0-9]+(-[a-z0-9:[\]/%.]+)*$/.test(tok) ||
            /^!?[a-z]+:/.test(tok) ||
            /^-?[a-z]+$/.test(tok)
        );
        if (tokens.length > 1 && cssLike.length / tokens.length >= 0.7) return true;
    }

    if (/^[a-z]+\/[a-z]+$/.test(t)) return true;

    if (/^\d+\.\d+/.test(t)) return true;

    if (/^\{[^}]+\}$/.test(t)) return true;

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

                if (parent.type === "ImportDeclaration") return;
                if (parent.type === "ExportNamedDeclaration") return;
                if (parent.type === "ExportDefaultDeclaration") return;

                if (parent.type === "CallExpression") return;

                if (parent.type === "ObjectProperty") return;
                if (parent.type === "ObjectMethod") return;

                if (parent.type === "VariableDeclarator") return;

                if (parent.type === "ArrayExpression") return;

                if (parent.type === "TemplateLiteral") return;

                if (parent.type === "MemberExpression") return;

                if (parent.type === "LogicalExpression") return;
                if (parent.type === "ConditionalExpression") return;

                if (parent.type === "JSXAttribute") {
                    const attrName =
                        (parent as any).name?.name ||
                        (parent as any).name?.value ||
                        "";
                    if (!TEXT_BEARING_ATTRS.has(attrName)) return;
                }

                if (parent.type === "AssignmentExpression") return;

                texts.push(text);
            },
        });
    } catch (err) { }

    return texts;
}