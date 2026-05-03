import fs from "fs-extra";
import path from "path";

let currentLanguage = "en";
let translations: Record<string, string> = {};
let isLoaded = false;

export function setLanguage(lang: string) {
  currentLanguage = lang;
  isLoaded = false;
}

export function getLanguage(): string {
  return currentLanguage;
}

async function loadTranslations() {
  if (isLoaded) return;

  try {
    const cwd = process.cwd();
    const filePath = path.join(cwd, "translations", `${currentLanguage}.json`);

    if (await fs.pathExists(filePath)) {
      translations = await fs.readJson(filePath);
    } else {
      translations = {};
    }

    isLoaded = true;
  } catch (err) {
    translations = {};
    isLoaded = true;
  }
}

export async function MT(text: string): Promise<string> {
  await loadTranslations();

  if (translations[text]) {
    return translations[text];
  }

  return text;
}

export function t(key: string): string {
  return translations[key] || key;
}