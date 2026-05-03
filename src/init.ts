import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { scanProject } from "./scanner";
import { translateAll } from "./translator";

export async function runInit() {
  const cwd = process.cwd();

  const configPath = path.join(cwd, "magic-translate.config.cjs");
  const oldConfigPath = path.join(cwd, "magic-translate.config.js");

  const exists =
    (await fs.pathExists(configPath)) ||
    (await fs.pathExists(oldConfigPath));

  if (exists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "Config already exists — do you want to set it up again?",
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("Setup cancelled!"));
      return;
    }
  }

  console.log(chalk.cyan("\n🪄 Magic Translate Setup\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "defaultLanguage",
      message: "What is the default language? (original app language)",
      default: "en",
    },
    {
      type: "input",
      name: "languages",
      message: "Which languages do you want to translate to? (comma separated)",
      default: "ur, fr, ar",
      validate: (input: string) => {
        if (input.trim().length === 0) {
          return "Please enter at least one language!";
        }
        return true;
      },
    },
  ]);

  const languages = answers.languages
    .split(",")
    .map((l: string) => l.trim().toLowerCase())
    .filter((l: string) => l.length > 0);

  const defaultLanguage = answers.defaultLanguage.trim().toLowerCase();

  console.log(chalk.green(`\n✅ Languages: ${languages.join(", ")}`));
  console.log(chalk.green(`✅ Default: ${defaultLanguage}\n`));

  console.log(chalk.yellow("📄 Step 1: Creating config file..."));
  await createConfig(cwd, defaultLanguage, languages);

  console.log(chalk.yellow("📁 Step 2: Creating translations folder..."));
  await createTranslationsFolder(cwd, defaultLanguage, languages);

  console.log(chalk.yellow("🔍 Step 3: Scanning project..."));
  const texts = await scanProject(cwd);
  console.log(chalk.green(`✅ Found ${texts.length} static texts!\n`));

  console.log(chalk.yellow("🌍 Step 4: Translating..."));
  await translateAll(texts, cwd);

  console.log(chalk.yellow("📂 Step 5: Setting up project..."));
  const isVite = await setupVite(cwd, defaultLanguage, languages);
  if (!isVite) {
    await setupNextJs(cwd, defaultLanguage, languages);
  }

  console.log(chalk.green("\n✅ Magic Translate is ready!\n"));
  console.log(chalk.cyan("Wrap your app with <MagicTranslate> from 'magic-translate/react'\n"));
}

async function setupVite(cwd: string, defaultLanguage: string, languages: string[]) {
  const viteConfigExists =
    (await fs.pathExists(path.join(cwd, "vite.config.js"))) ||
    (await fs.pathExists(path.join(cwd, "vite.config.ts")));

  if (!viteConfigExists) return false;

  const publicTranslationsPath = path.join(cwd, "public", "translations");
  await fs.ensureDir(publicTranslationsPath);

  const rootTranslationsPath = path.join(cwd, "translations");
  const allLangs = [...new Set([...languages, defaultLanguage])];

  for (const lang of allLangs) {
    const src = path.join(rootTranslationsPath, `${lang}.json`);
    const dest = path.join(publicTranslationsPath, `${lang}.json`);
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest, { overwrite: true });
      console.log(chalk.green(`   ✅ public/translations/${lang}.json ready!`));
    }
  }

  await fs.remove(rootTranslationsPath);
  console.log(chalk.green("   ✅ translations moved to public/translations!"));

  return true;
}

async function setupNextJs(cwd: string, defaultLanguage: string, languages: string[]) {
  const nextConfigExists =
    (await fs.pathExists(path.join(cwd, "next.config.js"))) ||
    (await fs.pathExists(path.join(cwd, "next.config.ts"))) ||
    (await fs.pathExists(path.join(cwd, "next.config.mjs")));

  if (!nextConfigExists) {
    console.log(chalk.gray("   ℹ️ Not a Next.js/Vite project — translations folder ready!"));
    return;
  }

  const publicTranslationsPath = path.join(cwd, "public", "translations");
  await fs.ensureDir(publicTranslationsPath);

  const rootTranslationsPath = path.join(cwd, "translations");
  const allLangs = [...new Set([...languages, defaultLanguage])];

  for (const lang of allLangs) {
    const src = path.join(rootTranslationsPath, `${lang}.json`);
    const dest = path.join(publicTranslationsPath, `${lang}.json`);
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest, { overwrite: true });
      console.log(chalk.green(`   ✅ public/translations/${lang}.json ready!`));
    }
  }

  await fs.remove(rootTranslationsPath);
  console.log(chalk.green("   ✅ translations moved to public/translations!"));

  await injectMagicTranslate(cwd, defaultLanguage, languages);
}

async function injectMagicTranslate(cwd: string, defaultLanguage: string, languages: string[]) {
  const layoutPaths = [
    path.join(cwd, "src", "app", "layout.tsx"),
    path.join(cwd, "app", "layout.tsx"),
    path.join(cwd, "src", "app", "layout.jsx"),
    path.join(cwd, "app", "layout.jsx"),
  ];

  let layoutPath = "";
  for (const p of layoutPaths) {
    if (await fs.pathExists(p)) {
      layoutPath = p;
      break;
    }
  }

  if (!layoutPath) {
    console.log(chalk.gray("   ℹ️ layout.tsx not found — skipping auto inject"));
    return;
  }

  const content = await fs.readFile(layoutPath, "utf-8");
  if (content.includes("MagicTranslate")) {
    console.log(chalk.gray("   ℹ️ MagicTranslate already in layout.tsx!"));
    return;
  }

  const newLayout = `import type { Metadata } from "next";
import "./globals.css";
import { MagicTranslate } from "magic-translate/react";

const magicConfig = {
  defaultLanguage: "${defaultLanguage}",
  languages: ${JSON.stringify(languages)},
};

export const metadata: Metadata = {
  title: "My App",
  description: "Powered by magic-translate",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="${defaultLanguage}">
      <body>
        <MagicTranslate config={magicConfig}>
          {children}
        </MagicTranslate>
      </body>
    </html>
  );
}
`;

  await fs.writeFile(layoutPath, newLayout);
  console.log(chalk.green("   ✅ layout.tsx updated with MagicTranslate!"));
}

async function createConfig(cwd: string, defaultLanguage: string, languages: string[]) {
  const oldPath = path.join(cwd, "magic-translate.config.js");
  if (await fs.pathExists(oldPath)) {
    await fs.remove(oldPath);
  }

  const configPath = path.join(cwd, "magic-translate.config.cjs");
  const config = `module.exports = {
  defaultLanguage: "${defaultLanguage}",
  languages: ${JSON.stringify(languages)},
  apiKey: "mt_free_demo",
};
`;

  await fs.writeFile(configPath, config);
  console.log(chalk.green("   ✅ magic-translate.config.cjs created!"));
}

async function createTranslationsFolder(cwd: string, defaultLanguage: string, languages: string[]) {
  const translationsPath = path.join(cwd, "translations");
  await fs.ensureDir(translationsPath);

  const allLangs = [...new Set([...languages, defaultLanguage])];
  for (const lang of allLangs) {
    const filePath = path.join(translationsPath, `${lang}.json`);
    if (!(await fs.pathExists(filePath))) {
      await fs.writeJson(filePath, {}, { spaces: 2 });
      console.log(chalk.green(`   ✅ translations/${lang}.json created!`));
    }
  }
}

export async function getConfig(cwd: string) {
  const cjsPath = path.join(cwd, "magic-translate.config.cjs");
  const jsPath = path.join(cwd, "magic-translate.config.js");

  let configPath = "";
  if (await fs.pathExists(cjsPath)) {
    configPath = cjsPath;
  } else if (await fs.pathExists(jsPath)) {
    configPath = jsPath;
  } else {
    console.log(
      chalk.red("❌ magic-translate.config not found — run 'npx magic-translate init' first")
    );
    process.exit(1);
  }

  return require(configPath);
}