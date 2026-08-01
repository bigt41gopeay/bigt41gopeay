# OKSANA — 3D spausdinti šviestuvai ir namų aksesuarai

Minimalistinis, mobile-first landing puslapis, skirtas reklamai per Facebook, Instagram ir TikTok.

## Kas viduje

- `index.html` — visiškai savarankiškas puslapis (HTML + CSS + JS viename faile, be jokių priklausomybių ar build žingsnio). Su schema.org struktūriniais duomenimis (OnlineStore, WebSite, ItemList/Product, FAQPage) SEO/AEO/AI matomumui.
- `robots.txt` — leidžia paieškos ir AI robotus (GPTBot, ClaudeBot, PerplexityBot ir kt.), nurodo sitemap.
- `sitemap.xml` — svetainės žemėlapis paieškos sistemoms.
- `llms.txt` — glausta parduotuvės santrauka AI asistentams (ChatGPT, Claude, Perplexity), kad jie teisingai cituotų kainas, terminus ir kontaktus.

## Kaip paleisti

Tiesiog atidarykite `index.html` naršyklėje, arba įkelkite į bet kurį statinį hostingą:

- **GitHub Pages** — Settings → Pages → nurodykite šį katalogą
- **Netlify / Vercel** — nutempkite katalogą į jų dashboard
- Bet kuris kitas hostingas — tai vienas statinis failas

## Ką pritaikyti prieš paleidžiant reklamą

1. **Socialinių tinklų nuorodos** — `index.html` faile pakeiskite `https://www.facebook.com/`, `https://www.instagram.com/` ir `https://www.tiktok.com/` į tikrus paskyrų adresus.
2. **El. paštas** — pakeiskite `info@oksana.lt` į tikrą adresą (sekcijoje „Užsakymai“).
3. **Kainos ir produktai** — kolekcijos kortelėse atnaujinkite pavadinimus ir kainas.
4. **OG paveikslėlis** — reklamoms per FB/IG rekomenduojama pridėti `<meta property="og:image" content="...">` su produkto nuotrauka (1200×630 px).
5. **Nuotraukos** — SVG iliustracijas kortelėse galima pakeisti tikromis produktų nuotraukomis (`.card-visual` bloke įdėkite `<img>`).
6. **Domenas** — visur naudojamas pakaitinis `https://oksana.lt/`. Įsigiję tikrą domeną, pakeiskite jį šiuose failuose: `index.html` (canonical, og:url ir visi JSON-LD blokai), `robots.txt` (Sitemap eilutė), `sitemap.xml`, `llms.txt`.

## SEO / AEO / AI kontrolinis sąrašas po paleidimo

1. **Google Search Console** — patvirtinkite svetainę ir pateikite `sitemap.xml`.
2. **Struktūrinių duomenų patikra** — [Google Rich Results Test](https://search.google.com/test/rich-results) turi rodyti Product, FAQ ir Organization be klaidų.
3. **OG žymų patikra** — [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) prieš paleidžiant FB/IG reklamą.
4. **Turinio atnaujinimai** — keičiant kainas ar DUK atsakymus puslapyje, atnaujinkite ir JSON-LD blokus `index.html` bei `llms.txt` (jie turi sutapti su matomu turiniu).
5. **Greitis** — puslapis be išorinių priklausomybių (išskyrus Google Fonts), todėl PageSpeed balas turėtų būti aukštas; nuotraukas įkėlus naudokite WebP formatą ir `loading="lazy"`.
