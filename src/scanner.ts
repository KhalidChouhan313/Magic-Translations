import fs from "fs-extra";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const SKIP_FOLDERS = ["node_modules", "dist", ".git", "translations", "public"];

// JSX attribute names whose string values ARE user-facing text
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

    // Too short
    if (t.length <= 2) return true;

    // Pure numbers
    if (/^\d+$/.test(t)) return true;

    // URLs / paths
    if (t.startsWith("http") || t.startsWith("www")) return true;
    if (t.includes("/") || t.includes("\\")) return true;

    // Starts with special chars (dot, underscore, @, #)
    if (/^[._@#]/.test(t)) return true;

    // Boolean literals
    if (t === "true" || t === "false") return true;

    // mt_ internal keys
    if (t.startsWith("mt_")) return true;

    // Hex colors
    if (/#[0-9a-fA-F]{3,8}/.test(t)) return true;

    // ALL_CAPS constants
    if (/^[A-Z_][A-Z0-9_]+$/.test(t)) return true;

    // camelCase identifiers (no spaces, starts with lowercase)
    if (/^[a-z][a-zA-Z0-9]+$/.test(t)) return true;

    // lowercase-with-hyphens (kebab-case: CSS classes, event names, keys)
    if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(t)) return true;

    // Simple all-lowercase word (likely a keyword/identifier)
    if (/^[a-z]+$/.test(t)) return true;

    // PascalCase (component names, type names)
    if (/^[A-Z][a-z]+([A-Z][a-z]*)+$/.test(t)) return true;

    // Looks like a CSS class string: multiple space-separated tokens where
    // most tokens are lowercase/hyphenated (Tailwind, Bootstrap, etc.)
    if (t.includes(" ")) {
        const tokens = t.split(/\s+/);
        const cssLike = tokens.filter((tok) =>
            /^[a-z0-9]+(-[a-z0-9:[\]/%.]+)*$/.test(tok) || // tailwind: flex, items-center, text-sm, w-[100px]
            /^!?[a-z]+:/.test(tok) ||                       // responsive prefix: md:, lg:, hover:
            /^-?[a-z]+$/.test(tok)                          // plain lowercase
        );
        // If 70%+ of tokens look like CSS utilities → skip
        if (tokens.length > 1 && cssLike.length / tokens.length >= 0.7) return true;
    }

    // Looks like an HTML/CSS attribute value (e.g. "text/html", "application/json")
    if (/^[a-z]+\/[a-z]+$/.test(t)) return true;

    // Version strings, semver
    if (/^\d+\.\d+/.test(t)) return true;

    // Format strings / templates with only placeholders and no real words
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

                // Skip all import/export statements
                if (parent.type === "ImportDeclaration") return;
                if (parent.type === "ExportNamedDeclaration") return;
                if (parent.type === "ExportDefaultDeclaration") return;

                // Skip function/method calls (e.g. require(), cn(), clsx(), classNames())
                if (parent.type === "CallExpression") return;

                // Skip object keys and config values
                if (parent.type === "ObjectProperty") return;

                texts.push(text);
            },
        });
    } catch (err) { }

    return texts;
}