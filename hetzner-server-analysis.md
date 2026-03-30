# Hetzner Serverių Analizė ir Pakeitimo Planas

**Data:** 2026-03-30
**Skubiai:** Hetzner kainų pakėlimas nuo 2026-04-01!

---

## 1. Dabartiniai Serveriai

Abu serveriai turi panašią konfigūraciją:

### Server #1269326 — srv1.e-centras.lt (FSN1-DC6)

| Komponentas | Specifikacija | Amžius / Būklė |
|-------------|--------------|-----------------|
| **CPU** | Intel Xeon E3-1245V2 (4C/8T, 3.4GHz) | ~2012 m. (Ivy Bridge) — **14 metų** |
| **RAM** | 4x 8192 MB DDR3 ECC = **32 GB** | Senas standartas, lėtesnis nei DDR4 |
| **Diskai** | 4x HDD SATA 2.0 TB Enterprise | Mechaniniai diskai, potencialus gedimo rizika dėl amžiaus |
| **RAID** | LSI MegaRAID SAS 9260-4i (4-Port SATA PCI-E) | Senas kontroleris, baterija gali būti nusidėvėjusi |
| **Tinklas** | 1 Gbit — Intel 82574L | Standartinis |
| **Vieta** | FSN1-DC6 (Falkenstein, Vokietija) | — |

### Server #1855311 — srv2.e-centras.lt (FSN1-DC4)

| Komponentas | Specifikacija |
|-------------|--------------|
| **CPU** | Intel Xeon E3-1245V2 (4C/8T, 3.4GHz) |
| **RAM** | 32 GB DDR3 ECC |
| **Diskai** | 4x HDD SATA 2.0 TB Enterprise |
| **Vieta** | FSN1-DC4 (Falkenstein, Vokietija) |

### Naudojimas

Serveriai naudojami: **shared hosting, CRM sistema, duomenų bazės, failų saugykla**.

---

## 2. Kodėl Reikia Keisti? (Rizikos)

| Problema | Paaiškinimas |
|----------|-------------|
| **CPU amžius (14 m.)** | E3-1245V2 yra 2012 m. procesorius. Naujesni CPU turi 2-3x geresnį našumą per vatą ir per branduolį. |
| **DDR3 RAM** | Lėtesnė nei DDR4/DDR5, mažesnė pralaidumas. DDR3 ECC moduliai nebegaminami — pakeitimas brangus. |
| **HDD gedimo rizika** | Enterprise HDD po 10+ metų darbo turi padidintą gedimo tikimybę. SMART duomenis verta patikrinti. |
| **RAID kontrolerio baterija** | LSI 9260-4i BBU (Battery Backup Unit) po tiek metų greičiausiai nusidėvėjusi — kyla duomenų praradimo rizika. |
| **Energijos sąnaudos** | Senesni serveriai naudoja daugiau elektros nei naujesni su panašiu našumu. |
| **Kainų pakėlimas** | Hetzner pakelia kainas nuo 2026-04-01 — geriau veikti dabar. |

---

## 3. Rekomenduojama Strategija: Auction Serveris + Storage Box

### Kodėl ši strategija?

- **Auction serveris** — galingas CPU + daug RAM + lokali saugykla OS ir DB
- **Hetzner Storage Box** — pigia tinklinė saugykla shared hosting failams ir backupams
- **Bendras biudžetas** — telpa į €60/mėn

### Dabartiniai Auction Pasiūlymai (2026-03-30)

*Šaltinis: radar.iodev.org — realiojo laiko Hetzner auction stebėjimas*

| # | CPU | RAM | Saugykla | Kaina/mėn | Vertinimas |
|---|-----|-----|----------|-----------|-----------|
| 1 | **Intel Xeon E5-1650V3** (6C/12T, 3.5GHz) | 64 GB DDR4 ECC | 2x 2TB Enterprise HDD | **€37.70** | ⭐ Geriausias kainos/kokybės |
| 2 | **AMD Ryzen 5 3600** (6C/12T, 3.6GHz) | 64 GB DDR4 | 2x 2TB Enterprise HDD | €44.86 | Geriausias našumas |
| 3 | Intel Core i7-7700 (4C/8T, 3.6GHz) | 32 GB DDR4 | 2x 512GB SSD | €43.67 | SSD greitis |
| 4 | Intel Core i7-6700 (4C/8T, 3.4GHz) | 64 GB DDR4 | 2x 512GB NVMe | €43.67 | NVMe greitis |

> **Pastaba:** Auction pasiūlymai keičiasi kas kelias minutes. Būtina filtruoti pagal **FSN1** lokaciją dėl IP perkėlimo!

### Hetzner Storage Box Kainos

| Planas | Talpa | Kaina/mėn (be PVM) | Protokolai |
|--------|-------|---------------------|------------|
| BX11 | 1 TB | €3.81 | SFTP, SCP, rsync, Samba/CIFS |
| BX21 | 5 TB | €9.52 | SFTP, SCP, rsync, Samba/CIFS |
| **BX31** | **10 TB** | **€18.52** | SFTP, SCP, rsync, Samba/CIFS |

---

## 4. Rekomenduojami Paketai

### ⭐ Rekomenduojamas: Xeon E5-1650V3 + Storage Box BX21

| Komponentas | Detalės | Kaina/mėn |
|-------------|---------|-----------|
| Auction serveris | E5-1650V3, 64GB DDR4 ECC, 2x2TB HDD | €37.70 |
| Storage Box BX21 | 5TB tinklinė saugykla | €9.52 |
| **Viso** | | **€47.22** |

**Palyginimas su dabartiniu serveriu:**

| | Dabartinis (E3-1245V2) | Naujas (E5-1650V3 + BX21) |
|---|----------------------|--------------------------|
| CPU branduoliai | 4C/8T | **6C/12T (+50%)** |
| CPU architektūra | Ivy Bridge (2012) | **Haswell-EP (2014)** |
| CPU našumas | ~100% (bazė) | **~160-180%** (multi-thread) |
| RAM | 32 GB DDR3 | **64 GB DDR4 (+100%)** |
| Lokali saugykla | 4x 2TB = 8TB raw | 2x 2TB = 4TB raw |
| Tinklinė saugykla | — | **+5TB (Storage Box)** |
| Bendra saugykla | 8TB | **9TB** |
| ECC palaikymas | Taip | **Taip** |
| Kaina | dabartinė kaina | **€47.22/mėn** |

### Alternatyva: Ryzen 5 3600 + Storage Box BX21

| Komponentas | Detalės | Kaina/mėn |
|-------------|---------|-----------|
| Auction serveris | Ryzen 5 3600, 64GB DDR4, 2x2TB HDD | €44.86 |
| Storage Box BX21 | 5TB tinklinė saugykla | €9.52 |
| **Viso** | | **€54.38** |

- Modernesnis CPU (Zen 2, 2019 m.) — **~200-250%** greičiau nei E3-1245V2
- Nėra ECC (nekritiškai web/shared hosting naudojimui)
- Kiek brangiau, bet gerokai galingesnis

---

## 5. IP Adresų Perkėlimas (FSN1)

### Reikalavimai

- Abu serveriai **privalo būti FSN1** duomenų centre (Falkenstein)
- IP perkėlimas galimas tik tarp serverių **tame pačiame parke**
- Hetzner Robot → Server → IPs → Transfer

### Žingsniai

1. Nusipirkti naują auction serverį **FSN1** lokacijoje
2. Sukonfigūruoti naują serverį (OS, servisus, duomenis)
3. Testuoti su laikinais IP adresais
4. Hetzner Robot → senojo serverio IPs → "Transfer" → pasirinkti naują serverį
5. Patikrinti ar viskas veikia su perkeltais IP
6. Atšaukti senąjį serverį

> **Svarbu:** IP perkėlimo metu gali būti trumpas prastovos laikas (kelios minutės).

---

## 6. Migracijos Checklist

### Prieš migraciją
- [ ] Patikrinti dabartinių serverių SMART duomenis (diskų būklė)
- [ ] Sukurti pilną backup visų duomenų
- [ ] Dokumentuoti visas servisų konfigūracijas (Apache/Nginx, MySQL, PHP, DNS, mail, etc.)
- [ ] Suplanuoti prastovos langą klientams

### Naujo serverio paruošimas
- [ ] Nusipirkti auction serverį FSN1 lokacijoje
- [ ] Užsisakyti Storage Box BX21 (5TB)
- [ ] Įdiegti OS (Debian/Ubuntu/AlmaLinux)
- [ ] Sukonfigūruoti RAID (software RAID1 su 2x2TB)
- [ ] Prijungti Storage Box per SFTP/CIFS
- [ ] Įdiegti web serverį, PHP, MySQL/MariaDB
- [ ] Įdiegti shared hosting panelę (jei naudojama — cPanel, DirectAdmin, etc.)
- [ ] Perkelti duomenis ir DB iš senojo serverio

### Perkėlimas
- [ ] Testuoti visas svetaines ir servisus su laikinais IP
- [ ] Perkelti IP adresus per Hetzner Robot
- [ ] Patikrinti DNS propagaciją
- [ ] Patikrinti SSL sertifikatus
- [ ] Patikrinti el. pašto servisus
- [ ] Stebėti 24-48 val. ar viskas stabilu

### Po migracijos
- [ ] Atšaukti senąjį serverį (tik po pilno patikrinimo!)
- [ ] Nustatyti automatinį backup į Storage Box
- [ ] Nustatyti monitoring (Uptime Robot, Hetrixtools, etc.)

---

## 7. SKUBU: Kainų Pakėlimas nuo 2026-04-01

Hetzner paskelbė kainų pakėlimą nuo **2026 m. balandžio 1 d.** Tai paliečia tiek naujus užsakymus, tiek esamus produktus.

### Ką daryti dabar:

1. **Šiandien/rytoj** — peržiūrėti auction pasiūlymus: [hetzner.com/sb](https://www.hetzner.com/sb)
2. **Filtruoti FSN1** — tik Falkenstein serverius
3. **Nustatyti alert** — [radar.iodev.org](https://radar.iodev.org/) leidžia gauti pranešimus kai pasirodo tinkamas serveris
4. **Nusipirkti prieš balandžio 1d.** — kad gauti dabartines kainas

---

## 8. Naudingos Nuorodos

- Hetzner Server Auction: https://www.hetzner.com/sb
- Server Radar (auction stebėjimas): https://radar.iodev.org/
- Hetzner Storage Box: https://www.hetzner.com/storage/storage-box
- Hetzner Robot (serverių valdymas): https://robot.hetzner.com
- Hetzner kainų pakėlimo pranešimas: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment
