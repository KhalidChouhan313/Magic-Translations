import React, { createContext, useContext, useEffect, useState } from "react";

interface MagicTranslateContextType {
  language: string;
  setLanguage: (lang: string) => void;
  languages: string[];
  translations: Record<string, Record<string, string>>;
}

const MagicTranslateContext = createContext<MagicTranslateContextType>({
  language: "en",
  setLanguage: () => {},
  languages: [],
  translations: {},
});

export function useMagicTranslate() {
  return useContext(MagicTranslateContext);
}

interface MagicTranslateProps {
  children: React.ReactNode;
  config: {
    defaultLanguage: string;
    languages: string[];
  };
}

const LANG_MAP: Record<string, string> = {
  english: "en",
  urdu: "ur",
  azerbaijani: "az",
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
};

function getLangCode(lang: string) {
  return LANG_MAP[lang.toLowerCase()] || lang;
}

export function MagicTranslate({ children, config }: MagicTranslateProps) {
  const [language, setLanguageState] = useState(config.defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadAll() {
      const all: Record<string, Record<string, string>> = {};

      for (const lang of config.languages) {
        try {
          const code = getLangCode(lang);
          const res = await fetch(`/translations/${code}.json`);
          if (res.ok) {
            all[lang] = await res.json();
          }
        } catch {
          all[lang] = {};
        }
      }

      setTranslations(all);
      setIsLoaded(true);
    }

    loadAll();
  }, [config.languages]);

  useEffect(() => {
    if (!isLoaded) return;
    
    restoreOriginal();

    if (language === config.defaultLanguage) {
      return;
    }

    const map = translations[language] || {};
    translateDOM(map);
  }, [language, isLoaded, translations, config.defaultLanguage]);

  function setLanguage(lang: string) {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("magic-translate-lang", lang);
    }
  }

  return (
    <MagicTranslateContext.Provider
      value={{ language, setLanguage, languages: config.languages, translations }}
    >
      {children}
    </MagicTranslateContext.Provider>
  );
}

function translateDOM(map: Record<string, string>) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = (node as Text).nodeValue?.trim();
    if (text && text.length > 1) {
      nodes.push(node as Text);
    }
  }

  for (const textNode of nodes) {
    const original = textNode.nodeValue?.trim() || "";
    const translated = map[original];

    if (translated) {
      if (!(textNode as any).__original) {
        (textNode as any).__original = textNode.nodeValue;
      }
      textNode.nodeValue = (textNode.nodeValue || "").replace(original, translated);
    }
  }
}

function restoreOriginal() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as any;
    if (textNode.__original) {
      textNode.nodeValue = textNode.__original;
      delete textNode.__original;
    }
  }
}