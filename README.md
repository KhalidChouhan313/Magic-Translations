# 🪄 Magic Translate

Auto translation for React & Next.js apps — zero manual work.

## Install

npm install magic-translate


## Setup

npx magic-translate init


Follow the prompts:
- Default language: `en`
- Languages to translate to: `ur, ar, fr`

## Usage — React / Vite

Wrap your app in `main.tsx`:

import { MagicTranslate } from 'magic-translate/react'

const config = {
  defaultLanguage: "en",
  languages: ["en", "ur", "ar"],
}

createRoot(document.getElementById('root')!).render(
  <MagicTranslate config={config}>
    <App />
  </MagicTranslate>
)


Use the hook anywhere:

import { useMagicTranslate } from 'magic-translate/react'

function LanguageSwitcher() {
  const { language, setLanguage, languages } = useMagicTranslate()

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      {languages.map((lang) => (
        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
      ))}
    </select>
  )
}


## Usage — Next.js

In `layout.tsx`:

import { MagicTranslate } from 'magic-translate/react'

const config = {
  defaultLanguage: "en", 
  languages: ["en", "ur", "ar"],
}

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <MagicTranslate config={config}>
          {children}
        </MagicTranslate>
      </body>
    </html>
  )
}


## Supported Languages

| Name | Code |
|------|------|
| English | en |
| Urdu | ur |
| Arabic | ar |
| French | fr |
| Spanish | es |
| German | de |
| Chinese | zh |
| Hindi | hi |
| Turkish | tr |
| Persian | fa |
| Russian | ru |
| Japanese | ja |
| Korean | ko |

...and 60+ more!

## Dynamic Text — MT()

For dynamic content use `MT()`:

import { MT } from 'magic-translate'

const message = await MT(`Hello ${userName}`)


## License

MIT © Khalid Chouhan