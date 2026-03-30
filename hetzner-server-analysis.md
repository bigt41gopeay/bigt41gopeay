# Hetzner Serverių Analizė ir Pakeitimo Planas

**Data:** 2026-03-30 (atnaujinta)
**Skubiai:** Hetzner kainų pakėlimas nuo 2026-04-01!
**Tikslas:** Konsoliduoti 2 serverius į 1, perkelti IP adresus, sumažinti kainą nuo €130/mėn

---

## 1. Dabartiniai Serveriai

### Dabartinės išlaidos: ~€130/mėn (be PVM)

| | srv1 | srv2 | IP adresai |
|---|---|---|---|
| Kaina/mėn | ~€37 | ~€37 | ~€56 |

### Hardware (abu panašūs)

| Komponentas | Specifikacija | Amžius / Būklė |
|-------------|--------------|-----------------|
| **CPU** | Intel Xeon E3-1245V2 (4C/8T, 3.4GHz) | ~2012 m. (Ivy Bridge) — **14 metų** |
| **RAM** | 4x 8192 MB DDR3 ECC = **32 GB** | Senas standartas, lėtesnis nei DDR4 |
| **Diskai** | 4x HDD SATA 2.0 TB Enterprise | Mechaniniai diskai, gedimo rizika |
| **RAID** | LSI MegaRAID SAS 9260-4i | Sena baterija |
| **Tinklas** | 1 Gbit — Intel 82574L | Standartinis |
| **Vietos** | srv1: FSN1-DC6, srv2: FSN1-DC4 | |

**Naudojimas:** shared hosting, CRM, duomenų bazės, failų saugykla.

---

## 2. Kodėl Reikia Keisti? (Rizikos)

| Problema | Paaiškinimas |
|----------|-------------|
| **CPU amžius (14 m.)** | E3-1245V2 yra 2012 m. procesorius. Naujesni CPU turi 2-3x geresnį našumą. |
| **DDR3 RAM** | Lėtesnė nei DDR4/DDR5. DDR3 ECC moduliai nebegaminami. |
| **HDD gedimo rizika** | Enterprise HDD po 10+ metų — padidinta gedimo tikimybė. |
| **RAID baterija** | LSI 9260-4i BBU greičiausiai nusidėvėjusi — duomenų praradimo rizika. |
| **2 serveriai = 2x kaina** | Mokate už 2 serverius kai vienas galingesnis gali viską aptarnauti. |
| **Kainų pakėlimas** | Hetzner pakelia kainas nuo 2026-04-01. |

---

## 3. Šiuo Metu Prieinami Auction Serveriai (2026-03-30)

### Dabar sandėlyje (FSN1)

#### ⭐ #2930358 — AMD Ryzen 5 3600 — **DABAR SANDĖLYJE nuo kovo 9d.**

| Spec | Detalės |
|------|---------|
| **CPU** | AMD Ryzen 5 3600 (6C/12T, 3.6GHz, Zen 2) |
| **RAM** | 64 GB DDR4 (2x 32GB) |
| **Saugykla** | 2x 1TB NVMe SSD + 2x 512GB NVMe SSD = **3TB NVMe** |
| **Vieta** | **FSN1-DC11** (Falkenstein) ✅ |
| **Kaina** | **€59.70/mėn** |
| **ECC** | Ne |

**Vertinimas:** Puikus variantas! Modernus CPU, 64GB RAM, 3TB grynai NVMe — DB ir svetainės bus žaibiškai greitos. FSN1 — IP perkėlimas galimas. Vienintelis trūkumas: 3TB saugyklos gali nepakakti viskam, bet su Storage Box problema išsprendžiama.

---

### Neseniai buvo / periodiškai pasirodo (FSN1)

#### #2946308 — Intel Xeon W-2145 (buvo sandėlyje nuo kovo 7d., dabar išparduotas)

| Spec | Detalės |
|------|---------|
| **CPU** | Intel Xeon W-2145 (8C/16T, 3.7GHz) |
| **RAM** | 192 GB DDR4 ECC reg. (6x 32GB) |
| **Saugykla** | 1x 2TB HDD + 2x 960GB NVMe + 1x 256GB SSD |
| **Vieta** | FSN1-DC11 |
| **Kaina** | €93.70/mėn |

#### #2583250 — Intel Xeon W-2145 + HDD (periodiškai pasirodo)

| Spec | Detalės |
|------|---------|
| **CPU** | Intel Xeon W-2145 (8C/16T, 3.7GHz) |
| **RAM** | 128 GB DDR4 ECC reg. |
| **Saugykla** | **2x 4TB HDD** + 2x 960GB SSD + RAID Adaptec 8405 |
| **Vieta** | FSN1-DC14 |
| **Kaina** | €104.70/mėn |

#### #2955526 — AMD Ryzen 7 3700X (periodiškai pasirodo)

| Spec | Detalės |
|------|---------|
| **CPU** | AMD Ryzen 7 3700X (8C/16T, 3.6GHz) |
| **RAM** | 64 GB DDR4 ECC |
| **Saugykla** | 2x 1TB NVMe SSD |
| **Vieta** | FSN1-DC24 |
| **Kaina** | €51.70/mėn |

---

### Iš radar.iodev.org (šiandien matomi)

| # | CPU | RAM | Saugykla | Kaina/mėn |
|---|-----|-----|----------|-----------|
| 1 | **Xeon E5-1650V3** (6C/12T) | 64GB DDR4 ECC | 2x 2TB HDD | **€43.67** (su PVM) |
| 2 | Core i7-6700 (4C/8T) | 64GB DDR4 | 2x 2TB HDD | €43.67 (su PVM) |
| 3 | Core i7-7700 (4C/8T) | 32GB DDR4 | 2x 512GB SSD | €43.67 (su PVM) |

> **Svarbu:** Šie serveriai gali būti bet kurioje lokacijoje. Prieš perkant **būtina patikrinti FSN1**!

---

## 4. Rekomenduojami Konsolidacijos Variantai

### ⭐ Variantas A: Auction #2930358 + Storage Box (DABAR GALIMAS!)

**Ryzen 5 3600 + 3TB NVMe + Storage Box**

| Komponentas | Detalės | Kaina/mėn |
|-------------|---------|-----------|
| Auction serveris | Ryzen 5 3600, 64GB, 3TB NVMe | €59.70 |
| Storage Box BX21 | 5TB failams/backup | €9.52 |
| IP adresai (perkelti) | Iš abiejų serverių | ~€56.00 |
| **Viso** | | **~€125.22** |
| **Sutaupymas** | | **~€5/mėn** |

**Privalumai:**
- 3TB NVMe = **100x greičiau** nei dabartiniai HDD
- CPU ~2.5x galingesnis nei E3-1245V2
- 64GB RAM (pakanka abiejų serverių workload)
- **Dabar sandėlyje!** FSN1-DC11
- DB ir svetainės veiks žymiai greičiau

**Trūkumai:**
- Nedidelis sutaupymas (€5/mėn), bet serveris žymiai geresnis
- Nėra ECC RAM (priimtina shared hosting/CRM)
- 3TB NVMe + 5TB Storage Box = 8TB (pakanka)

---

### Variantas B: Auction Xeon E5-1650V3 + Storage Box (jei FSN1)

**E5-1650V3 + 4TB HDD + Storage Box**

| Komponentas | Detalės | Kaina/mėn |
|-------------|---------|-----------|
| Auction serveris | E5-1650V3, 64GB ECC, 2x2TB HDD | ~€37.00 |
| Storage Box BX21 | 5TB failams/backup | €9.52 |
| IP adresai | | ~€56.00 |
| **Viso** | | **~€102.52** |
| **Sutaupymas** | | **~€27/mėn = €324/metus** |

**Privalumai:**
- Pigiausia opcija, didžiausias sutaupymas
- ECC RAM
- 64GB DDR4

**Trūkumai:**
- HDD (ne SSD) — DB lėtesnė nei su NVMe
- **Reikia patikrinti ar yra FSN1 lokacijoje!**
- Senesnis CPU nei Ryzen

---

### Variantas C: Hetzner AX42 (naujas, ne auction)

**Ryzen 7 PRO 8700GE + NVMe + Storage Box**

| Komponentas | Detalės | Kaina/mėn |
|-------------|---------|-----------|
| AX42 serveris | Ryzen 7 PRO 8700GE (8C/16T), 64GB DDR5, 2x512GB NVMe | €46.00 |
| Storage Box BX21 | 5TB | €9.52 |
| IP adresai | | ~€56.00 |
| **Viso** | | **~€111.52** |
| **Sutaupymas** | | **~€18/mėn = €216/metus** |

**Privalumai:**
- Naujausias CPU (Zen 4, 2024) — **4x greičiau** nei E3-1245V2
- DDR5 ECC
- Garantija (naujas serveris)
- FSN1 prieinamas

**Trūkumai:**
- Tik 1TB NVMe (reikia Storage Box)
- €46 setup fee

---

## 5. Palyginimo Lentelė

| | Dabartinė (2 srv) | A: Ryzen 3600 auction | B: E5-1650V3 auction | C: AX42 naujas |
|---|---|---|---|---|
| **CPU** | 2x E3-1245V2 (4C) | Ryzen 5 3600 (6C) | E5-1650V3 (6C) | Ryzen 7 8700GE (8C) |
| **RAM** | 2x 32GB DDR3 | 64GB DDR4 | 64GB DDR4 ECC | 64GB DDR5 ECC |
| **Lokali saugykla** | 2x (4x2TB HDD) | 3TB NVMe | 4TB HDD | 1TB NVMe |
| **+ Storage Box** | — | +5TB | +5TB | +5TB |
| **Bendra talpa** | 16TB | 8TB | 9TB | 6TB |
| **Greitis (diskai)** | HDD (~150 MB/s) | **NVMe (~3500 MB/s)** | HDD (~150 MB/s) | **NVMe (~3500 MB/s)** |
| **Kaina/mėn** | **€130** | **€125** | **€103** | **€112** |
| **Sutaupymas/metus** | — | €60 | **€324** | €216 |
| **FSN1?** | ✅ | ✅ FSN1-DC11 | ❓ Reikia tikrinti | ✅ |
| **Prieinamumas** | — | **DABAR!** | Reikia laukti/tikrinti | Visada |

---

## 6. Mano Rekomendacija

### Dabar: **Variantas A — Auction #2930358** (Ryzen 5 3600)

**Kodėl:**
1. **Dabar sandėlyje** FSN1-DC11 — galite pirkti iš karto
2. **3TB NVMe** — viskas bus žaibiškai greita (DB, svetainės, CRM)
3. **64GB RAM** — pakanka viskam
4. Kaina panaši, bet serveris **nepalyginamai geresnis**
5. **Prieš balandžio 1d. kainų pakėlimą!**

### Vėliau (jei norite dar pigiau): stebėkite Variantą B

Nustatykite alert per [radar.iodev.org](https://radar.iodev.org/) FSN1 serveriams su >=64GB RAM ir >=4TB HDD kaina iki €40/mėn.

---

## 7. IP Adresų Perkėlimas (FSN1)

### Reikalavimai

- Naujas serveris **privalo būti FSN1** (Falkenstein)
- IP perkėlimas galimas tik tarp serverių **tame pačiame parke**
- Hetzner Robot → Server → IPs → Transfer

### Žingsniai

1. Nusipirkti naują auction serverį **FSN1** lokacijoje
2. Sukonfigūruoti naują serverį (OS, servisus, duomenis)
3. Testuoti su laikinais IP adresais
4. Hetzner Robot → senojo serverio IPs → "Transfer" → pasirinkti naują serverį
5. Patikrinti ar viskas veikia su perkeltais IP
6. Atšaukti abu senus serverius

> **Svarbu:** Perkelkite IP iš **abiejų** serverių į naują vieną serverį.

---

## 8. Migracijos Checklist

### Prieš migraciją
- [ ] Patikrinti dabartinių serverių SMART duomenis (diskų būklė)
- [ ] Sukurti pilną backup visų duomenų (abu serveriai)
- [ ] Dokumentuoti visas servisų konfigūracijas (Apache/Nginx, MySQL, PHP, DNS, mail, etc.)
- [ ] Suskaičiuoti kiek vietos užima duomenys (ar tilps į 3TB NVMe + 5TB Storage Box)
- [ ] Suplanuoti prastovos langą klientams

### Naujo serverio paruošimas
- [ ] Nusipirkti auction serverį FSN1 lokacijoje
- [ ] Užsisakyti Storage Box BX21 (5TB)
- [ ] Įdiegti OS (Debian/Ubuntu/AlmaLinux)
- [ ] Sukonfigūruoti NVMe RAID1 (2x1TB arba 2x512GB)
- [ ] Prijungti Storage Box per SFTP/CIFS/rsync
- [ ] Įdiegti web serverį, PHP, MySQL/MariaDB
- [ ] Įdiegti shared hosting panelę (cPanel, DirectAdmin, CloudPanel, etc.)
- [ ] Perkelti duomenis ir DB iš **abiejų** senų serverių

### Perkėlimas
- [ ] Testuoti visas svetaines ir servisus su laikinais IP
- [ ] Perkelti IP adresus per Hetzner Robot (iš abiejų serverių)
- [ ] Patikrinti DNS propagaciją
- [ ] Patikrinti SSL sertifikatus
- [ ] Patikrinti el. pašto servisus
- [ ] Stebėti 24-48 val. ar viskas stabilu

### Po migracijos
- [ ] Atšaukti abu senus serverius (tik po pilno patikrinimo!)
- [ ] Nustatyti automatinį backup į Storage Box
- [ ] Nustatyti monitoring (Uptime Robot, Hetrixtools, etc.)

---

## 9. SKUBU: Kainų Pakėlimas nuo 2026-04-01

Hetzner paskelbė kainų pakėlimą nuo **2026 m. balandžio 1 d.**:
- Auction serveriai: **+3%** kainų pakėlimas
- Kiti produktai: **+30-50%** priklausomai nuo produkto
- Paliečia tiek naujus užsakymus, tiek esamus

### Ką daryti DABAR:

1. **ŠIANDIEN** — pirkti auction #2930358 (Ryzen 5 3600, FSN1-DC11, €59.70)
2. Per savaitę — sukonfigūruoti serverį ir perkelti duomenis
3. Perkelti IP adresus
4. Atšaukti senus serverius

---

## 10. Naudingos Nuorodos

- Hetzner Server Auction: https://www.hetzner.com/sb
- Server Radar (auction stebėjimas): https://radar.iodev.org/
- ServerHunter (auction paieška): https://www.serverhunter.com/
- Hetzner Storage Box: https://www.hetzner.com/storage/storage-box
- Hetzner Robot (serverių valdymas): https://robot.hetzner.com
- Hetzner AX42 (naujas serveris): https://www.hetzner.com/dedicated-rootserver/ax42/
- Hetzner kainų pakėlimas: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment
- Hetzner IP kainos: https://docs.hetzner.com/general/infrastructure-and-availability/ipv4-pricing/
