# OKSANA — 3D spausdinti šviestuvai ir namų aksesuarai

Minimalistinis, mobile-first landing puslapis, skirtas reklamai per Facebook, Instagram ir TikTok.

## Kas viduje

- `index.html` — visiškai savarankiškas puslapis (HTML + CSS + JS viename faile, be jokių priklausomybių ar build žingsnio).

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
