# Google Calendar integracija – nustatymo instrukcija

## Žingsnis po žingsnio

### 1. Sukurkite Google Cloud projektą

1. Eikite į [console.cloud.google.com](https://console.cloud.google.com)
2. Viršuje spustelėkite **"Select a project"** → **"New Project"**
3. Įveskite projekto pavadinimą (pvz. `ManoKRM`) → **Create**

---

### 2. Įjunkite Google Calendar API

1. Eikite į **APIs & Services → Library**
2. Paieškos laukelyje įveskite `Google Calendar API`
3. Spustelėkite rezultatą → **Enable**

---

### 3. Sukonfigūruokite OAuth consent screen

1. Eikite į **APIs & Services → OAuth consent screen**
2. Pasirinkite **External** → **Create**
3. Užpildykite:
   - **App name**: `ManoKRM`
   - **User support email**: jūsų el. paštas
   - **Developer contact information**: jūsų el. paštas
4. Spauskite **Save and Continue** per visus žingsnius
5. Žingsnyje **Test users** pridėkite savo Google paskyrą

---

### 4. Sukurkite OAuth2 credentials

1. Eikite į **APIs & Services → Credentials**
2. Spustelėkite **+ Create Credentials → OAuth client ID**
3. **Application type**: pasirinkite **Web application**
4. **Name**: `ManoKRM Web`
5. **Authorized JavaScript origins** – pridėkite:
   ```
   https://mano.oktoja.lt
   ```
6. Spustelėkite **Create**

---

### 5. Nukopijuokite Client ID

1. Pasirodys langas su **Client ID** ir **Client Secret**
2. Nukopijuokite **Client ID** (atrodo kaip: `123456789-xxxx.apps.googleusercontent.com`)
3. **Client Secret nereikalingas** – sistema naudoja tik Client ID

---

### 6. Įveskite Client ID į CRM

1. Atidarykite [https://mano.oktoja.lt](https://mano.oktoja.lt)
2. Eikite į skyrių **⚙️ Nustatymai**
3. Įklijuokite **Client ID** į laukelį
4. Spustelėkite **Prisijungti prie Google Calendar**
5. Pasirodys Google autorizacijos langas – leiskite prieigą

---

## Galimybės po prisijungimo

| Funkcija | Aprašymas |
|----------|-----------|
| 📅 Automatinis įvykių kūrimas | Sukūrus darbą su terminu – automatiškai sukuria įvykį Google Calendar |
| ✅ Sinchronizuotas užbaigimas | Pažymėjus darbą kaip atliktą – atnaujina Google Calendar įvykį |
| 🔄 Sinchronizacija | Mygtuku „Sinchronizuoti" atnaujina artimiausius įvykius |
| ← Importas | Galima importuoti Google Calendar įvykius kaip darbus į CRM |
| 📊 Dashboard | Rodo artimiausius Google Calendar įvykius Apžvalgos puslapyje |

---

## Saugumas

- **Client ID** saugomas naršyklės `localStorage` (nešifruotas)
- **Access token** saugomas tik `sessionStorage` – ištrinamas uždarant naršyklę
- Kiekvieną sesiją reikia iš naujo prisijungti prie Google
- Client Secret **nenaudojamas** – sistema naudoja implicit OAuth2 flow

---

## Dažniausios klaidos

**"Not a valid origin for the client"**
→ Patikrinkite, ar `https://mano.oktoja.lt` pridėtas į Authorized JavaScript origins

**"Access blocked: This app's request is invalid"**
→ Patikrinkite OAuth consent screen konfigūraciją

**"Token expired"**
→ Atsijunkite ir prisijunkite iš naujo Nustatymuose

---

*ManoKRM sistema · mano.oktoja.lt*
