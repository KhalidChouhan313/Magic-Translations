# 🪄 Magic Translate

> Auto-translate your React & Next.js app with zero manual work. One CLI command scans your entire project, translates all static text, and lets users switch languages at runtime — no `t()` functions, no manual JSON editing.

---

## How It Works

1. You run `npx magic-translate init`
2. It scans your project for all static text
3. It auto-translates everything into your chosen languages
4. You wrap your app with `<MagicTranslate>` — done!

---

## Installation

```bash
npm install magic-translate
```

---

## Step 1 — Run Init

Inside your project folder, run:

```bash
npx magic-translate init
```

It will ask you two questions:

? What is the default language? (original app language) › en
? Which languages do you want to translate to? (comma separated) › ur, ar, fr

After this, it will:
- ✅ Create `magic-translate.config.cjs` in your root
- ✅ Scan your entire project for static text
- ✅ Auto-translate everything using free APIs
- ✅ Save translations in `public/translations/` folder

---

## Step 2 — Wrap Your App

### React / Vite — `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { MagicTranslate } from 'magic-translate/react'

const magicConfig = {
  defaultLanguage: "en",
  languages: ["en", "ur", "ar"],
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MagicTranslate config={magicConfig}>
      <App />
    </MagicTranslate>
  </StrictMode>,
)
```

### Next.js — `src/app/layout.tsx`

```tsx
import { MagicTranslate } from 'magic-translate/react'

const magicConfig = {
  defaultLanguage: "en",
  languages: ["en", "ur", "ar"],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MagicTranslate config={magicConfig}>
          {children}
        </MagicTranslate>
      </body>
    </html>
  )
}
```

---

## Step 3 — Add Language Switcher

Use the `useMagicTranslate` hook anywhere in your app to build a language switcher:

```tsx
import { useMagicTranslate } from 'magic-translate/react'

export function LanguageSwitcher() {
  const { language, setLanguage, languages } = useMagicTranslate()

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  )
}
```

Place it anywhere — navbar, header, settings page — wherever you want!

---

## Dynamic Text — `MT()`

For text that changes at runtime (user names, API data, etc.), use the `MT()` function:

```tsx
import { MT } from 'magic-translate'

const greeting = await MT(`Welcome back, ${userName}!`)
```

> **Note:** `MT()` is only needed for dynamic content. All static text in your JSX is translated automatically — no `t()` wrappers needed!

---

## Supported Languages

You can use either the full name or the code:

| Language | Code | Language | Code |
|----------|------|----------|------|
| English | `en` | Arabic | `ar` |
| Urdu | `ur` | French | `fr` |
| Spanish | `es` | German | `de` |
| Chinese | `zh` | Hindi | `hi` |
| Turkish | `tr` | Persian | `fa` |
| Russian | `ru` | Japanese | `ja` |
| Korean | `ko` | Bengali | `bn` |
| Portuguese | `pt` | Indonesian | `id` |
| Vietnamese | `vi` | Thai | `th` |

...and 60+ more languages supported!

Both formats work in config:
```tsx
// Using codes
languages: ["en", "ur", "ar"]

// Using full names — also works!
languages: ["english", "urdu", "arabic"]
```

---

## Full Example

```tsx
// src/App.tsx
import { useMagicTranslate } from 'magic-translate/react'

function App() {
  const { language, setLanguage, languages } = useMagicTranslate()

  return (
    <div>
      {/* Language Switcher */}
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        {languages.map((lang) => (
          <option key={lang} value={lang}>{lang.toUpperCase()}</option>
        ))}
      </select>

      {/* This text is auto-translated — no t() needed! */}
      <h1>Welcome to my app</h1>
      <p>This text will be automatically translated</p>
      <button>Click here</button>
    </div>
  )
}
```

---

## Quick Start Summary

```bash
# 1. Install
npm install magic-translate

# 2. Scan & translate your project
npx magic-translate init

# 3. Wrap your app with <MagicTranslate>
# 4. Add <LanguageSwitcher> anywhere
# 5. Done! 🎉
```

---

## License

MIT © [Khalid Chouhan](https://github.com/KhalidChouhan313)