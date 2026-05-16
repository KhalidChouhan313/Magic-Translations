import fs from "fs-extra";
import path from "path";
import axios from "axios";
import chalk from "chalk";
import { getConfig } from "./init";

const LINGVA_SERVERS = [
  "https://lingva.tiekoetter.com/api/v1",
  "https://translate.plausibility.cloud/api/v1",
  "https://lingva.ml/api/v1",
  "https://lingva.lunar.icu/api/v1",
  "https://lingva.hexogen.eu/api/v1",
];

const api = axios.create({
  timeout: 5000,
});

const MAX_CONCURRENT = 15;
const RETRIES = 1;
const LANG_MAP: Record<string, string> = {
  english: "en",
  urdu: "ur",
  arabic: "ar",
  spanish: "es",
  french: "fr",
  german: "de",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  russian: "ru",
  hindi: "hi",
  bengali: "bn",
  portuguese: "pt",
  azerbaijani: "az",

  italian: "it",
  dutch: "nl",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  finnish: "fi",
  polish: "pl",
  czech: "cs",
  slovak: "sk",
  hungarian: "hu",
  romanian: "ro",
  greek: "el",
  ukrainian: "uk",
  bulgarian: "bg",
  serbian: "sr",
  croatian: "hr",
  slovenian: "sl",
  lithuanian: "lt",
  latvian: "lv",
  estonian: "et",

  persian: "fa",
  turkish: "tr",
  hebrew: "he",
  kazakh: "kk",
  uzbek: "uz",
  turkmen: "tk",
  kyrgyz: "ky",
  tajik: "tg",

  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  gujarati: "gu",
  punjabi: "pa",
  sinhala: "si",
  nepali: "ne",

  indonesian: "id",
  malay: "ms",
  thai: "th",
  vietnamese: "vi",
  filipino: "tl",
  burmese: "my",
  khmer: "km",
  lao: "lo",

  swahili: "sw",
  amharic: "am",
  hausa: "ha",
  yoruba: "yo",
  igbo: "ig",
  zulu: "zu",
  xhosa: "xh",
  afrikaans: "af",

  icelandic: "is",
  maltese: "mt",
  albanian: "sq",
  macedonian: "mk",
  georgian: "ka",
  armenian: "hy",
  mongolian: "mn"
};

function getLangCode(lang: string) {
  return LANG_MAP[lang.toLowerCase()] || lang;
}

export async function translateAll(texts: string[], cwd: string) {
  const config = await getConfig(cwd);

  if (texts.length === 0) {
    console.log(chalk.gray("   No text found for translation!"));
    return;
  }

  for (const rawLang of config.languages) {
    const lang = getLangCode(rawLang);
    console.log(chalk.cyan(`\n   🌍 Translating to ${lang} (${rawLang})...`));

    const translationsPath = path.join(cwd, "translations", `${lang}.json`);

    let existing: Record<string, string> = {};
    if (await fs.pathExists(translationsPath)) {
      existing = await fs.readJson(translationsPath);
    }

    const translated: Record<string, string> = { ...existing };
    let count = 0;

    const filteredTexts = texts.filter(
      (text) =>
        !(existing[text] && existing[text] !== text) &&
        text.length > 2 &&
        !text.startsWith("mt_")
    );

    let index = 0;

    async function worker() {
      while (index < filteredTexts.length) {
        const currentIndex = index++;
        const text = filteredTexts[currentIndex];

        try {
          const result = await retryTranslate(
            text,
            getLangCode(config.defaultLanguage),
            lang
          );
          translated[text] = result;
          count++;
          process.stdout.write(chalk.green("."));
        } catch (err) {
          translated[text] = text;
        }
      }
    }

    const workers = Array.from({ length: MAX_CONCURRENT }, () => worker());
    await Promise.all(workers);

    await fs.writeJson(translationsPath, translated, { spaces: 2 });

    console.log(
      chalk.green(`\n   ✅ ${count} texts saved in ${lang}.json`)
    );
  }

  await saveDefaultLanguage(texts, cwd, config);
}

async function retryTranslate(
  text: string,
  from: string,
  to: string
): Promise<string> {
  let lastError: any;

  for (let i = 0; i <= RETRIES; i++) {
    try {
      const result = await translateWithFallback(text, from, to);
      return result;
    } catch (err) {
      lastError = err;
      if (i < RETRIES) await sleep(150);
    }
  }

  throw lastError;
}

async function translateWithFallback(
  text: string,
  from: string,
  to: string
): Promise<string> {
  let lastError: any;

  for (const server of LINGVA_SERVERS) {
    try {
      return await translateText(text, from, to, server);
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError;
}

async function translateText(
  text: string,
  from: string,
  to: string,
  server: string
): Promise<string> {
  const url = `${server}/${from}/${to}/${encodeURIComponent(text)}`;

  const response = await api.get(url);

  if (response.data?.translation) {
    return response.data.translation;
  }

  throw new Error("Translation failed");
}

async function saveDefaultLanguage(
  texts: string[],
  cwd: string,
  config: any
) {
  const defaultLangCode = getLangCode(config.defaultLanguage);
  const filePath = path.join(
    cwd,
    "translations",
    `${defaultLangCode}.json`
  );

  let existing: Record<string, string> = {};
  if (await fs.pathExists(filePath)) {
    existing = await fs.readJson(filePath);
  }

  const result: Record<string, string> = { ...existing };

  for (const text of texts) {
    if (text.length <= 2) continue;
    if (text.startsWith("mt_")) continue;
    result[text] = text;
  }

  await fs.writeJson(filePath, result, { spaces: 2 });
  console.log(chalk.green(`   ✅ ${defaultLangCode}.json updated!`));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}