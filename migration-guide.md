# Migracijos Vadovas: 2 Serveriai → 1 Naujas

**Situacija:** srv1 (FSN1-DC6) + srv2 (FSN1-DC4) → 1 naujas serveris (FSN1)
**Servisai:** shared hosting, CRM, duomenų bazės, el. paštas, failų saugykla

---

## Turinys

1. [Pasiruošimas (1-2 dienos)](#1-pasiruošimas)
2. [Naujo serverio setup (1 diena)](#2-naujo-serverio-setup)
3. [Duomenų perkėlimas (1-2 dienos)](#3-duomenų-perkėlimas)
4. [Testavimas (1 diena)](#4-testavimas)
5. [IP perkėlimas ir paleidimas (30 min)](#5-ip-perkėlimas)
6. [Senų serverių atšaukimas](#6-senų-serverių-atšaukimas)

---

## 1. Pasiruošimas

### 1.1 Inventorizacija — ką turime ant kiekvieno serverio

Prisijunkite per SSH prie **kiekvieno** serverio ir paleiskite:

```bash
# === Paleiskite ant srv1 IR srv2 ===

# Kiek vietos užimta
df -h
du -sh /* 2>/dev/null | sort -rh | head -20

# Kokia OS ir versija
cat /etc/os-release
uname -a

# Kokie servisai veikia
systemctl list-units --type=service --state=running

# Web serveris
apache2 -v 2>/dev/null || nginx -v 2>/dev/null || httpd -v 2>/dev/null

# PHP versija
php -v

# MySQL/MariaDB versija
mysql --version

# Kiek DB ir kokios
mysql -e "SHOW DATABASES;" 2>/dev/null

# Kokie domenai/svetainės (Apache)
apache2ctl -S 2>/dev/null || httpd -S 2>/dev/null

# Kokie domenai/svetainės (Nginx)
nginx -T 2>/dev/null | grep server_name

# El. pašto serveris
postconf mail_version 2>/dev/null
dovecot --version 2>/dev/null

# Cron jobs
crontab -l
ls /etc/cron.d/

# SSL sertifikatai
ls -la /etc/letsencrypt/live/ 2>/dev/null
ls -la /etc/ssl/certs/ 2>/dev/null

# Hosting panelė (jei yra)
which cpanel 2>/dev/null
which directadmin 2>/dev/null
which cyberpanel 2>/dev/null
which cloudpanel 2>/dev/null

# Firewall taisyklės
iptables -L -n
```

### 1.2 Užsirašykite rezultatus

Sukurkite lentelę:

```
SRV1:
  - OS: _______________
  - Web: Apache/Nginx _______________
  - PHP: _______________
  - DB: MySQL/MariaDB _______________
  - Panelė: _______________
  - Domenai: _______________
  - DB sąrašas: _______________
  - Paštas: _______________
  - Užimta vietos: _______________

SRV2:
  - OS: _______________
  - (tas pats)
```

### 1.3 Pilnas backup

```bash
# === Ant kiekvieno serverio ===

# Sukurti backup katalogą
mkdir -p /root/backup

# 1. Eksportuoti VISAS duomenų bazes
mysqldump --all-databases --single-transaction --routines --triggers > /root/backup/all-databases.sql

# Arba po vieną (jei labai didelės):
# mysqldump --single-transaction dbname > /root/backup/dbname.sql

# 2. Backup web failų
tar czf /root/backup/www.tar.gz /var/www/ 2>/dev/null
# arba jei naudojate kitą kelią:
# tar czf /root/backup/www.tar.gz /home/*/public_html/ 2>/dev/null

# 3. Backup konfigūracijų
tar czf /root/backup/etc.tar.gz /etc/apache2/ /etc/nginx/ /etc/php/ \
  /etc/mysql/ /etc/postfix/ /etc/dovecot/ /etc/letsencrypt/ \
  /etc/cron.d/ 2>/dev/null

# 4. Backup el. pašto
tar czf /root/backup/mail.tar.gz /var/mail/ /var/vmail/ 2>/dev/null

# 5. Backup vartotojų home katalogų
tar czf /root/backup/home.tar.gz /home/ 2>/dev/null

# Patikrinti backup dydį
du -sh /root/backup/*
```

---

## 2. Naujo Serverio Setup

### 2.1 OS diegimas

Per **Hetzner Robot** → naujas serveris → **Rescue** → **Linux**:

```bash
# Prisijungti per SSH prie rescue sistemos
ssh root@NAUJAS_SERVERIO_IP

# Paleisti Hetzner installimage
installimage
```

Pasirinkite:
- **OS:** Debian 12 (arba Ubuntu 22.04/24.04 — ką naudojote anksčiau)
- **RAID:** Software RAID1 (jei 2x NVMe — veidrodinis backup)
- **Hostname:** srv.jusudomenas.lt

Po instaliacijos serveris perkraus. Prisijunkite iš naujo.

### 2.2 Bazinis saugumas

```bash
# Atnaujinti sistemą
apt update && apt upgrade -y

# Pakeisti SSH portą (neprivaloma, bet rekomenduojama)
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
systemctl restart sshd

# Įdiegti firewall
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp    # SSH (arba 22 jei nekeitėte)
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 25/tcp      # SMTP
ufw allow 465/tcp     # SMTPS
ufw allow 587/tcp     # Submission
ufw allow 993/tcp     # IMAPS
ufw allow 110/tcp     # POP3
ufw allow 995/tcp     # POP3S
ufw enable

# Įdiegti fail2ban
apt install -y fail2ban
systemctl enable fail2ban
```

### 2.3 Web serverio diegimas

#### Jei naudojote Apache:
```bash
apt install -y apache2
a2enmod rewrite ssl headers expires proxy proxy_fcgi
systemctl enable apache2
```

#### Jei naudojote Nginx:
```bash
apt install -y nginx
systemctl enable nginx
```

### 2.4 PHP diegimas

```bash
# Įdiegti PHP (pakeiskite versiją pagal savo poreikius)
apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-curl php8.2-gd \
  php8.2-mbstring php8.2-xml php8.2-zip php8.2-intl php8.2-bcmath \
  php8.2-soap php8.2-imap php8.2-opcache php8.2-redis

# Jei reikia senesnės PHP versijos shared hosting klientams:
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php  # Ubuntu
# arba Debian:
# curl -sSL https://packages.sury.org/php/README.txt | bash

apt install -y php7.4 php7.4-fpm php7.4-mysql php7.4-curl php7.4-gd \
  php7.4-mbstring php7.4-xml php7.4-zip 2>/dev/null

systemctl enable php8.2-fpm
```

### 2.5 Duomenų bazė

```bash
apt install -y mariadb-server
systemctl enable mariadb

# Saugumas
mysql_secure_installation
```

### 2.6 El. pašto serveris

```bash
# Postfix (SMTP)
apt install -y postfix postfix-mysql
# Pasirinkite "Internet Site" kai paklaus

# Dovecot (IMAP/POP3)
apt install -y dovecot-core dovecot-imapd dovecot-pop3d dovecot-mysql dovecot-lmtpd

systemctl enable postfix dovecot
```

### 2.7 SSL sertifikatai

```bash
apt install -y certbot python3-certbot-apache  # arba python3-certbot-nginx
```

### 2.8 Storage Box prijungimas

```bash
# Įdiegti reikalingus paketus
apt install -y sshfs cifs-utils

# Prijungti per CIFS/Samba (greičiau nei SFTP)
mkdir -p /mnt/storagebox
echo "//uXXXXXX.your-storagebox.de/backup /mnt/storagebox cifs credentials=/etc/storagebox-credentials,uid=0,gid=0 0 0" >> /etc/fstab

# Sukurti credentials failą
cat > /etc/storagebox-credentials << 'EOF'
username=uXXXXXX
password=JUSU_SLAPTAZODIS
EOF
chmod 600 /etc/storagebox-credentials

mount /mnt/storagebox

# ARBA per rsync/SFTP (backup'ams):
# rsync -avz /var/www/ uXXXXXX@uXXXXXX.your-storagebox.de:./www/
```

---

## 3. Duomenų Perkėlimas

### 3.1 Perkelti failus iš srv1

```bash
# === Paleiskite ant NAUJO serverio ===

# Perkelti web failus iš srv1
rsync -avzP --progress root@SRV1_IP:/var/www/ /var/www/

# Perkelti home katalogus
rsync -avzP root@SRV1_IP:/home/ /home/

# Perkelti el. paštą
rsync -avzP root@SRV1_IP:/var/mail/ /var/mail/
rsync -avzP root@SRV1_IP:/var/vmail/ /var/vmail/ 2>/dev/null

# Perkelti Apache/Nginx konfigūracijas
rsync -avzP root@SRV1_IP:/etc/apache2/sites-available/ /etc/apache2/sites-available/
rsync -avzP root@SRV1_IP:/etc/apache2/sites-enabled/ /etc/apache2/sites-enabled/
# arba Nginx:
# rsync -avzP root@SRV1_IP:/etc/nginx/sites-available/ /etc/nginx/sites-available/

# Perkelti SSL sertifikatus
rsync -avzP root@SRV1_IP:/etc/letsencrypt/ /etc/letsencrypt/

# Perkelti cron jobs
rsync -avzP root@SRV1_IP:/etc/cron.d/ /etc/cron.d/
ssh root@SRV1_IP "crontab -l" > /tmp/srv1_crontab.txt

# Perkelti DB
ssh root@SRV1_IP "mysqldump --all-databases --single-transaction --routines --triggers" | mysql
```

### 3.2 Perkelti failus iš srv2

```bash
# === Tas pats procesą pakartoti srv2 ===
# SVARBU: atsargiai su failais kurie gali konfliktuoti!

# Perkelti web failus iš srv2 (į atskirą katalogą jei reikia)
rsync -avzP root@SRV2_IP:/var/www/ /var/www/

# Perkelti home katalogus (--ignore-existing kad neperrašytų)
rsync -avzP --ignore-existing root@SRV2_IP:/home/ /home/

# Perkelti el. paštą
rsync -avzP root@SRV2_IP:/var/mail/ /var/mail/

# Perkelti Apache vhost konfigūracijas
rsync -avzP root@SRV2_IP:/etc/apache2/sites-available/ /etc/apache2/sites-available/

# Perkelti DB iš srv2
# SVARBU: jei DB pavadinimai nesikartoja su srv1:
ssh root@SRV2_IP "mysqldump --all-databases --single-transaction --routines --triggers" | mysql

# Jei DB pavadinimai kartojasi — eksportuoti po vieną:
# ssh root@SRV2_IP "mysqldump --single-transaction db_name" | mysql db_name
```

### 3.3 Patikrinti perkelimą

```bash
# Palyginti failų dydžius
echo "=== NAUJAS SERVERIS ==="
du -sh /var/www/
du -sh /home/
du -sh /var/mail/

# Palyginti su senais (per SSH)
echo "=== SRV1 ==="
ssh root@SRV1_IP "du -sh /var/www/ /home/ /var/mail/"
echo "=== SRV2 ==="
ssh root@SRV2_IP "du -sh /var/www/ /home/ /var/mail/"

# Patikrinti DB
mysql -e "SHOW DATABASES;"
# Palyginti su senais serveriais

# Patikrinti failų teises
chown -R www-data:www-data /var/www/
```

---

## 4. Testavimas

### 4.1 Konfigūracijų taisymas

```bash
# Įjungti visus Apache vhostus
cd /etc/apache2/sites-available/
for site in *.conf; do a2ensite "$site"; done
apache2ctl configtest
systemctl reload apache2

# ARBA Nginx:
# nginx -t
# systemctl reload nginx

# Patikrinti PHP
php -m  # ar visi reikalingi moduliai?

# Patikrinti MySQL vartotojus
mysql -e "SELECT user, host FROM mysql.user;"
# Gali reikėti atkurti slaptažodžius ar teises
```

### 4.2 Testavimas per hosts failą (be IP perkėlimo!)

Savo **lokaliame kompiuteryje** (ne serveryje) redaguokite hosts failą:

```bash
# Mac/Linux: /etc/hosts
# Windows: C:\Windows\System32\drivers\etc\hosts

# Pridėkite eilutes su NAUJO serverio laikinu IP:
NAUJAS_IP   domenas1.lt
NAUJAS_IP   www.domenas1.lt
NAUJAS_IP   domenas2.lt
NAUJAS_IP   mail.domenas1.lt
```

Dabar naršyklėje atidarykite svetaines — jos turėtų krautis iš **naujo** serverio:
- [ ] Svetainės kraunasi?
- [ ] Prisijungimas prie CRM veikia?
- [ ] Duomenų bazė veikia? (ieškokite klaidų svetainėse)
- [ ] SSL sertifikatai veikia? (jei naudojate Let's Encrypt — reikės pergeneruoti po IP perkėlimo)
- [ ] El. paštas siunčiasi ir gaunasi?

### 4.3 Dažniausios klaidos ir kaip jas taisyti

```bash
# Klaida: "Permission denied"
chown -R www-data:www-data /var/www/
find /var/www/ -type d -exec chmod 755 {} \;
find /var/www/ -type f -exec chmod 644 {} \;

# Klaida: "Access denied for user" (MySQL)
# Sukurti trūkstamą DB vartotoją:
mysql -e "CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';"
mysql -e "GRANT ALL PRIVILEGES ON dbname.* TO 'username'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Klaida: Apache "Could not reliably determine the server's FQDN"
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Klaida: PHP modulis trūksta
apt install php8.2-MODULIO_PAVADINIMAS
systemctl restart php8.2-fpm

# Klaida: SSL sertifikatas negalioja (kitas IP)
certbot renew --force-renewal
```

---

## 5. IP Perkėlimas

### SVARBU: Tai padaryti kai viskas ištestuota!

### 5.1 Paskutinis duomenų sinchronizavimas

```bash
# Prieš pat IP perkėlimą — paskutinis rsync
# (perkelti tik pasikeitusiais failus nuo pirmojo perkėlimo)

rsync -avzP root@SRV1_IP:/var/www/ /var/www/
rsync -avzP root@SRV2_IP:/var/www/ /var/www/

# Paskutinis DB dump (SVARBU — naujausi duomenys!)
ssh root@SRV1_IP "mysqldump --all-databases --single-transaction" | mysql
ssh root@SRV2_IP "mysqldump --all-databases --single-transaction" | mysql
```

### 5.2 Perkelti IP per Hetzner Robot

1. Eikite į **robot.hetzner.com**
2. **Servers** → pasirinkite **srv1**
3. Tab **IPs**
4. Prie kiekvieno IP spauskite **Transfer**
5. Pasirinkite **naują serverį** kaip tikslą
6. Pakartokite su **srv2** IP adresais

### 5.3 Sukonfigūruoti IP adresus naujame serveryje

```bash
# Patikrinti kokius IP gavote
ip addr show

# Jei reikia pridėti papildomus IP (Debian/Ubuntu su netplan):
cat > /etc/netplan/01-additional-ips.yaml << 'EOF'
network:
  version: 2
  ethernets:
    enp0s31f6:     # pakeiskite į savo tinklo interfeisą
      addresses:
        - SRV1_SENAS_IP/32
        - SRV2_SENAS_IP/32
        - PAPILDOMAS_IP_1/32
        - PAPILDOMAS_IP_2/32
EOF

netplan apply

# ARBA Debian su ifupdown:
cat >> /etc/network/interfaces << 'EOF'

auto enp0s31f6:1
iface enp0s31f6:1 inet static
    address SRV1_SENAS_IP
    netmask 255.255.255.255

auto enp0s31f6:2
iface enp0s31f6:2 inet static
    address SRV2_SENAS_IP
    netmask 255.255.255.255
EOF

ifup enp0s31f6:1
ifup enp0s31f6:2

# Patikrinti
ip addr show
ping -c 3 SRV1_SENAS_IP
ping -c 3 SRV2_SENAS_IP
```

### 5.4 Apache/Nginx atnaujinimas su teisingais IP

```bash
# Jei vhostuose nurodyti specifiniai IP — pakeisti
grep -r "SRV1_SENAS_IP\|SRV2_SENAS_IP" /etc/apache2/sites-available/
# Atnaujinti jei reikia

apache2ctl configtest
systemctl reload apache2
```

### 5.5 SSL sertifikatų atnaujinimas

```bash
# Let's Encrypt sertifikatai veikia nepriklausomai nuo IP,
# bet geriau pergeneruoti:
certbot renew --force-renewal

# Patikrinti
certbot certificates
```

---

## 6. Senų Serverių Atšaukimas

### NE IŠ KARTO! Palaukite minimum 1-2 savaites.

### 6.1 Stebėjimo periodas (1-2 savaitės)

```bash
# Ant naujo serverio stebėkite:

# Ar nėra klaidų?
tail -f /var/log/apache2/error.log    # arba nginx
tail -f /var/log/mysql/error.log
tail -f /var/log/mail.log

# Ar serveris nestabilus?
uptime
free -h
df -h

# Ar visi domenai veikia?
# Testuokite kiekvieną svetainę naršyklėje
```

### 6.2 Kai viskas stabilu — atšaukti senus serverius

1. Hetzner Robot → **srv1** → **Cancellation**
2. Hetzner Robot → **srv2** → **Cancellation**
3. Pasirinkite **artimiausią datą**

---

## 7. Automatinis Backup (po migracijos)

```bash
# Sukurti backup skriptą
cat > /root/backup.sh << 'SCRIPT'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/mnt/storagebox/backup/$DATE"
mkdir -p "$BACKUP_DIR"

# DB backup
mysqldump --all-databases --single-transaction --routines --triggers | gzip > "$BACKUP_DIR/all-databases.sql.gz"

# Failų backup (tik pasikeitę failai)
rsync -az /var/www/ "$BACKUP_DIR/www/"
rsync -az /home/ "$BACKUP_DIR/home/"
rsync -az /var/mail/ "$BACKUP_DIR/mail/"
rsync -az /etc/ "$BACKUP_DIR/etc/"

# Ištrinti senesnius nei 30 dienų backup
find /mnt/storagebox/backup/ -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "Backup done: $DATE" >> /var/log/backup.log
SCRIPT

chmod +x /root/backup.sh

# Paleisti kas naktį 3:00
echo "0 3 * * * /root/backup.sh" | crontab -
```

---

## Laiko Planas

| Diena | Veiksmas | Trukmė |
|-------|---------|--------|
| **1 diena** | Inventorizacija + backup senų serverių | 2-4 val. |
| **1 diena** | Nusipirkti naują serverį + OS setup | 1-2 val. |
| **2 diena** | Įdiegti servisus (web, PHP, DB, mail) | 3-5 val. |
| **2-3 diena** | Perkelti duomenis rsync + mysqldump | 2-8 val. (priklausomai nuo duomenų kiekio) |
| **3 diena** | Testavimas per hosts failą | 2-4 val. |
| **4 diena** | Klaidų taisymas | 1-4 val. |
| **4 diena (vakaras)** | Paskutinis sync + IP perkėlimas | 30-60 min. |
| **5-18 diena** | Stebėjimas | — |
| **Po 2 sav.** | Atšaukti senus serverius | 5 min. |
