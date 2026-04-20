# Domeno prijungimas ir SSL konfigūracija

## 1. DNS konfigūracija

Savo domeno registratoriaus valdymo panelėje nukreipkite domeną į serverio IP:

```
Type  Name                 Value
A     mazujupasaulis.lt    88.198.130.212
A     www                  88.198.130.212
```

Palaukite 10-60 min., kol DNS pasikeis (galite patikrinti su `dig mazujupasaulis.lt`).

## 2. SSL sertifikatas per Let's Encrypt (nemokamai)

Prisijunkite prie serverio per SSH:

```bash
ssh -p 2208 root@176.9.7.48
```

Instaliuokite certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

Gaukite ir aktyvuokite sertifikatą (automatiškai pakeis Nginx konfigūraciją):

```bash
certbot --nginx -d mazujupasaulis.lt -d www.mazujupasaulis.lt
```

Per `certbot` vedlį:
- Įveskite savo el. paštą
- Sutikite su Terms of Service (A)
- Atsisakykite EFF newsletter (N) arba sutikite (Y)
- Pasirinkite **2** – visus HTTP užklausas nukreipti į HTTPS

## 3. Automatinis atnaujinimas

Certbot automatiškai atnaujina sertifikatus. Patikrinkite:

```bash
certbot renew --dry-run
systemctl status certbot.timer
```

## 4. Atnaujinkite BASE_URL aplinkoje

Kad el. laiškai ir sitemap naudotų teisingą URL, atnaujinkite PM2 procesą:

```bash
pm2 stop mazujupasaulis
cd /var/www/mazujupasaulis/server
BASE_URL=https://mazujupasaulis.lt PORT=3001 pm2 start index.js --name mazujupasaulis --update-env
pm2 save
```

Arba geriau – sukurkite `.env` failą:

```bash
cat > /var/www/mazujupasaulis/server/.env << 'EOF'
PORT=3001
BASE_URL=https://mazujupasaulis.lt
JWT_SECRET=keisti-i-saugu-secret-mazuju-2026

# SMTP (el. laiškai)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jusu@gmail.com
SMTP_PASS=app-password
SMTP_FROM=MažųjųPasaulis <info@mazujupasaulis.lt>
ADMIN_EMAIL=admin@mazujupasaulis.lt

# Stripe (mokėjimai)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EOF

pm2 restart mazujupasaulis --update-env
```

## 5. Google Search Console (SEO)

1. Eikite į https://search.google.com/search-console
2. Pridėkite savo domeną `mazujupasaulis.lt`
3. Patvirtinkite nuosavybę per DNS TXT įrašą
4. Pateikite sitemap: `https://mazujupasaulis.lt/sitemap.xml`

## 6. Facebook / Meta Business (socialiniai)

1. Eikite į https://business.facebook.com
2. Sukurkite verslo puslapį "MažųjųPasaulis"
3. Pridėkite domeną į Domain Verification
4. Pridėkite pikselio kodą į `index.html` (prieš `</head>`):

```html
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'JUSU_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

## 7. Google Analytics 4

Pridėkite į `index.html` prieš `</head>`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 8. El. pašto konfigūracija

### Gmail App Password (paprastesnis variantas)

1. Eikite į https://myaccount.google.com/apppasswords
2. Sukurkite aplikacijos slaptažodį pavadinimu "MažųjųPasaulis"
3. Nukopijuokite 16 simbolių slaptažodį ir įkelkite į `.env` kaip `SMTP_PASS`

### Dedicated SMTP (geresnis)

Naudokite vieną iš:
- **Mailgun** (nemokamai iki 100 el./d.)
- **SendGrid** (nemokamai iki 100 el./d.)
- **Amazon SES** (pigu, ~$0.10 per 1000 el.)
- **Brevo** (buvęs Sendinblue, nemokamai 300/d.)

## 9. Stripe konfigūracija

1. Eikite į https://dashboard.stripe.com
2. Sukurkite paskyrą ir suaktyvinkite Lietuvoje
3. Pasiimkite API raktus: **Developers → API keys**
4. Įkelkite `STRIPE_SECRET_KEY` į `.env`
5. Sukonfigūruokite webhook: **Developers → Webhooks → Add endpoint**
   - URL: `https://mazujupasaulis.lt/api/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
6. Nukopijuokite "Signing secret" į `STRIPE_WEBHOOK_SECRET`
7. Perkraukite serverį: `pm2 restart mazujupasaulis --update-env`

## 10. Backup strategija

### Automatinis SQLite backup

```bash
mkdir -p /root/backups
echo "0 3 * * * cp /var/www/mazujupasaulis/server/data/mazuju.db /root/backups/mazuju-\$(date +\%Y\%m\%d).db && find /root/backups -name 'mazuju-*.db' -mtime +30 -delete" | crontab -
```

### Paveikslėlių backup

```bash
# Kasdien 4:00 – backup uploads
echo "0 4 * * * tar -czf /root/backups/uploads-\$(date +\%Y\%m\%d).tar.gz -C /var/www/mazujupasaulis/server uploads/" | (crontab -l; cat) | crontab -
```

## 11. Stebėjimas

```bash
# Realaus laiko
pm2 monit

# Logai
pm2 logs mazujupasaulis

# Nginx logai
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# SSL sertifikato statusas
certbot certificates
```

---

**Viskas paruošta! Svetainė dabar yra pilnai produkcinėje aplinkoje su SSL, el. laiškais, mokėjimais ir SEO.** 🚀
