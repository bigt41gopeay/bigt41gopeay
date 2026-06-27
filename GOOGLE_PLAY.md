# Google Play Store – MažųjųPasaulis App

Šis dokumentas paaiškina, kaip publikuoti `mazujupasaulis.lt` kaip Android programėlę Google Play parduotuvėje.

## Kelias: PWA → TWA (Trusted Web Activity)

Mūsų svetainė jau yra **PWA** (turi `manifest.json` ir veikia offline'ish per service worker). Naudosim **Bubblewrap** — Google oficialų įrankį, kuris suvyniojama PWA į Android APK su Chrome rendering engine'u. Privalumai:

- ✅ Nereikia rašyti jokio native kodo
- ✅ Tinklalapio atnaujinimai matosi iš karto (be Google Play review)
- ✅ Mažas APK dydis (~150KB — tik tilto kodas, Chrome jau įdiegtas)
- ✅ Android Back mygtukas automatiškai veikia (mūsų pataisymas: SPA istorija)
- ✅ Push pranešimai per Web Push API

## Prielaidos

- Bus reikalinga Google Play Console paskyra (vienkartinis $25 mokestis)
- Java JDK 17+ (Bubblewrap reikalavimas)
- Node.js 18+ (jau yra)
- Android keystore failas (sukursi pirmu žingsniu)

## Žingsniai

### 1. Patikrink PWA reikalavimus

Atidaryk `https://mazujupasaulis.lt` Chrome'e, paspausk **F12 → Lighthouse → Generate report (PWA)**. Visos žalios varnelės = good. Turi būti:

- ✅ HTTPS
- ✅ `manifest.json` su `name`, `short_name`, `start_url`, `icons` (192px + 512px)
- ✅ Service worker (jau yra `public/sw.js`)
- ✅ Viewport meta
- ✅ Theme color

### 2. Sukurk Android keystore

Lokaliam kompiuteryje:

```bash
keytool -genkey -v -keystore mazujupasaulis.keystore \
  -alias mazujupasaulis -keyalg RSA -keysize 2048 -validity 25000
```

Įsidėmėk slaptažodį — bus reikalingas kiekvieno deploy'o metu. **Saugok šį failą** — be jo nebegalėsi atnaujinti app'o.

### 3. Įdiek Bubblewrap

```bash
npm install -g @bubblewrap/cli
bubblewrap doctor          # patikrina sistemą
```

### 4. Inicializuok TWA projektą

```bash
mkdir -p ~/mazujupasaulis-android && cd ~/mazujupasaulis-android
bubblewrap init --manifest https://mazujupasaulis.lt/manifest.json
```

Interaktyvūs klausimai:
- **Domain**: `mazujupasaulis.lt`
- **Application ID**: `lt.mazujupasaulis.app`
- **Display mode**: `standalone`
- **Status bar color**: `#6C63FF`
- **Splash screen**: nuotraukos iš PWA manifest
- **Keystore**: nurodyk savo `.keystore` failo kelią + slaptažodį

### 5. Build APK + AAB

```bash
bubblewrap build           # sugeneruoja app-release-signed.apk ir .aab
```

`.aab` (Android App Bundle) yra Google Play reikalaujamas formatas.

### 6. Digital Asset Links (būtina!)

Bubblewrap išspausdins SHA-256 fingerprint'ą. Reikia įdėti į svetainę, kad Android žinotų jog tu valdai domeną.

Sukurk `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "lt.mazujupasaulis.app",
    "sha256_cert_fingerprints": ["TAVO_SHA256_FINGERPRINT_IS_BUBBLEWRAP"]
  }
}]
```

Deploy serveryje + verifikuok:
```bash
curl https://mazujupasaulis.lt/.well-known/assetlinks.json
```

**Be šio failo TWA atsidarys naršyklės "address bar" – atrodys nepatrauklu.** Su juo — pilnas full-screen app jausmas.

### 7. Google Play Console

1. https://play.google.com/console — sukurk paskyrą ($25 vienkartinis)
2. Spausk **„Create app"** → įvesk:
   - Pavadinimas: `MažųjųPasaulis`
   - Kalba: Lietuvių (lt-LT)
   - App / Game: **App** (turinys mokomasis)
   - Free / Paid: Free
3. **App content** → užpildyk: Privacy policy, COPPA (vaikai), data safety
4. **Store listing**:
   - Short description (80 simb.): „Vaikų edukacinė platforma — žaidimai, knygos, mokymai"
   - Full description (4000 simb.): detalus aprašymas + visi 24 žaidimai
   - Screenshots: 2–8 phone screens (1080×1920px), 1+ tablet screen (1200×1920)
   - Icon: 512×512 PNG
   - Feature graphic: 1024×500 PNG
5. **Production** → **Create new release** → upload `.aab` failą
6. Review request → Google peržiūri 1–3 dienas

### 8. Atnaujinimai

**Turinio (HTML/JS/CSS)** atnaujinimai — vyksta TIESIOGIAI per `deploy.sh`. TWA visada įkrauna naujausią svetainės versiją.

**Native shell** atnaujinimai (logo, splash, app ID) — reikalauja naujo `bubblewrap build` ir naujos versijos įkėlimo į Play Console.

## Alternatyvos

Jei nori native funkcijų (kamera vaiko nuotraukai, GPS, in-app purchases):
- **Capacitor** (Ionic) — gali pridėti native plugin'us, bet didesnis app dydis ~5MB
- **React Native** — visiškas perrašymas, didžiausias darbas
- **Bubblewrap + Capacitor hybrid** — TWA pagrindas, native kameros plugin per Capacitor

## Apple App Store

Apple **NEPALAIKO** TWA. Reikia:
- PWA per Safari „Add to Home Screen" (paprasčiausia, bet nėra App Store)
- arba Capacitor / React Native portas + $99/metus developer paskyra

Galim spręsti vėliau jei reikės.

## Greitas kontrolinis sąrašas

- [ ] Patikrinau PWA per Lighthouse (visos žalios)
- [ ] Sukūriau Android keystore ir saugiai išsaugojau
- [ ] Įdiegiau Bubblewrap CLI
- [ ] `bubblewrap init` su `manifest.json`
- [ ] `bubblewrap build` sėkmingai
- [ ] Sukūriau `public/.well-known/assetlinks.json` su teisingu SHA-256
- [ ] Google Play paskyra apmokėta ($25)
- [ ] Užpildžiau Store Listing + Privacy policy
- [ ] Įkėliau `.aab` į Production
- [ ] Review pasibaigė, app gyvas Play parduotuvėje
