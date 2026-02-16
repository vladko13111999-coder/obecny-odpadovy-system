# Obecný odpadový systém

Komplexná webová aplikácia (SaaS) pre starostov obcí na správu odpadového hospodárstva, ktorá pomáha splniť novú legislatívu (NIS2, vyhláška č. 89/2024 Z.z.) a motivuje obyvateľov k triedeniu pomocou gamifikácie.

## 🎯 Hlavné funkcie

- **Autentifikácia a registrácia** s 30-dňovým trialom
- **Evidencia obyvateľov** s bodovacím systémom
- **Správa vývozov odpadu** s automatickým počítaním bodov
- **Gamifikácia** - 2 body za každý kg triediaceho odpadu (plast, papier, sklo)
- **Generovanie reportov** (CSV a XML) pre štátne hlásenia podľa vyhlášky č. 89/2024 Z.z.
- **Stripe integrácia** pre predplatné (49€/99€/149€ podľa veľkosti obce)
- **Notifikácie** pred koncom kvartálu
- **Row Level Security (RLS)** pre bezpečnosť dát

## 🛠️ Technický stack

- **Framework:** Next.js 16 (Pages Router)
- **Jazyk:** JavaScript
- **Štýly:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Platby:** Stripe
- **Knižnice:** csv-stringify, xml2js

## 📋 Predpoklady

- Node.js 18+ a pnpm
- Supabase účet (https://supabase.com)
- Stripe účet (https://stripe.com)

## 🚀 Inštalácia a spustenie

### 1. Klonovanie projektu

```bash
cd obecny-odpadovy-system
pnpm install
```

### 2. Nastavenie Supabase

1. Vytvorte nový projekt na https://supabase.com
2. V SQL Editore spustite skript `supabase-schema.sql`
3. Vytvorte storage bucket s názvom `reports` (Settings → Storage)
4. Skopírujte URL projektu a API kľúče (Settings → API)

### 3. Nastavenie Stripe

1. Vytvorte účet na https://stripe.com
2. Prejdite do Dashboard → Products
3. Vytvorte 3 produkty (recurring/monthly):
   - **Malá obec**: 49 EUR/mesiac
   - **Stredná obec**: 99 EUR/mesiac
   - **Veľká obec**: 149 EUR/mesiac
4. Skopírujte Price ID pre každý produkt
5. Nastavte webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Počúvajte na udalosti: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Skopírujte webhook secret

### 4. Konfigurácia environment variables

Vytvorte súbor `.env.local` (alebo upravte existujúci) a vyplňte hodnoty:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product Price IDs
STRIPE_PRICE_ID_SMALL=price_xxx_small
STRIPE_PRICE_ID_MEDIUM=price_xxx_medium
STRIPE_PRICE_ID_LARGE=price_xxx_large

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Spustenie vývojového servera

```bash
pnpm dev
```

Aplikácia bude dostupná na http://localhost:3000

## 📁 Štruktúra projektu

```
obecny-odpadovy-system/
├── components/
│   └── DashboardLayout.js       # Layout pre dashboard s navigáciou
├── lib/
│   └── supabaseClient.js        # Supabase konfigurácia
├── pages/
│   ├── api/
│   │   ├── create-checkout-session.js  # Stripe checkout API
│   │   ├── generate-report.js          # Generovanie reportov
│   │   └── webhooks/
│   │       └── stripe.js               # Stripe webhook handler
│   ├── dashboard/
│   │   ├── index.js             # Hlavný dashboard
│   │   ├── obyvatelia.js        # Správa obyvateľov
│   │   ├── vyvozy.js            # Evidencia vývozov
│   │   ├── reporty.js           # Generovanie reportov
│   │   └── nastavenia.js        # Nastavenia
│   ├── index.js                 # Úvodná stránka
│   ├── login.js                 # Prihlásenie
│   ├── register.js              # Registrácia
│   └── upgrade.js               # Aktivácia predplatného
├── middleware.js                # Middleware pre kontrolu predplatného
├── supabase-schema.sql          # Databázová schéma
├── .env.local                   # Environment variables
└── package.json                 # Dependencies
```

## 🗄️ Databázová schéma

### Tabuľky

1. **obce** - Informácie o obciach
   - id, nazov, email, velkost_obce, subscription_status, trial_start, trial_end, stripe_customer_id, stripe_subscription_id, auth_user_id

2. **obyvatelia** - Evidencia obyvateľov
   - id, obec_id, meno, priezvisko, ulica, cislo_popisne, celkove_body

3. **vyvozy** - Záznamy o vývozoch odpadu
   - id, obec_id, obyvatel_id, datum, typ_odpadu, mnozstvo_kg, body

4. **reporty** - Vygenerované kvartálne reporty
   - id, obec_id, kvartal, rok, subor_csv, subor_xml, vygenerovane_dna

### Bezpečnosť (RLS)

Všetky tabuľky majú implementované Row Level Security politiky, ktoré zabezpečujú, že:
- Starosta vidí len dáta svojej obce
- Nemôže pristupovať k dátam iných obcí
- Všetky operácie sú viazané na `auth_user_id`

## 🎮 Používanie aplikácie

### Registrácia

1. Prejdite na hlavnú stránku
2. Kliknite na "Registrovať obec"
3. Vyplňte formulár (názov obce, email, heslo, veľkosť obce)
4. Automaticky získate 30-dňový trial

### Pridanie obyvateľov

1. Prihláste sa do dashboardu
2. Prejdite na "Obyvatelia"
3. Kliknite "Pridať obyvateľa"
4. Vyplňte údaje (meno, priezvisko, adresa)

### Evidencia vývozov

1. Prejdite na "Vývozy"
2. Vyberte obyvateľa, dátum, typ odpadu a množstvo
3. Body sa automaticky vypočítajú:
   - Plast, papier, sklo: **2 body/kg**
   - Zmiešaný odpad: **0 bodov**

### Generovanie reportov

1. Prejdite na "Reporty pre štát"
2. Vyberte kvartál a rok
3. Kliknite "Generovať report"
4. Stiahnite CSV alebo XML súbor
5. Odošlite do systému ISOH

### Aktivácia predplatného

1. Po skončení trialu budete presmerovaní na stránku "Upgrade"
2. Vyberte plán podľa veľkosti obce
3. Kliknite "Aktivovať predplatné"
4. Dokončite platbu cez Stripe Checkout

## 🚢 Nasadenie (Deployment)

### Vercel (odporúčané)

1. Pushite projekt na GitHub
2. Importujte projekt na https://vercel.com
3. Nastavte environment variables v Vercel Dashboard
4. Deploy!

### Iné platformy

Aplikácia je kompatibilná s:
- Netlify
- Railway
- Render
- AWS Amplify

**Dôležité:** Po nasadení aktualizujte:
- `NEXT_PUBLIC_APP_URL` na produkčnú URL
- Stripe webhook endpoint na `https://your-domain.com/api/webhooks/stripe`

## 🔒 Bezpečnosť

- Všetky heslá sú hashované cez Supabase Auth
- RLS politiky zabezpečujú izoláciu dát medzi obcami
- API routes vyžadujú autentifikáciu
- Stripe webhooks sú verifikované pomocou webhook secret
- HTTPS je povinné pre produkciu

## 📝 Legislatíva

Aplikácia je pripravená na splnenie požiadaviek:
- **Vyhláška č. 89/2024 Z.z.** - Kvartálne hlásenia o odpade
- **NIS2** - Kybernetická bezpečnosť (RLS, šifrovanie)

Reporty obsahují:
- Agregované množstvá odpadu podľa typu
- Časové obdobie (kvartál, rok)
- Identifikáciu obce
- Formáty CSV a XML pre import do ISOH

## 🐛 Riešenie problémov

### Chyba pri prihlásení
- Skontrolujte, či sú správne nastavené Supabase credentials
- Overte, že ste spustili `supabase-schema.sql`

### Stripe checkout nefunguje
- Overte, že máte správne nastavené Price IDs
- Skontrolujte, či je `NEXT_PUBLIC_APP_URL` správne nastavená

### Middleware presmerováva na upgrade
- Skontrolujte `subscription_status` a `trial_end` v tabuľke `obce`
- Overte, že webhook od Stripe funguje správne

## 📞 Podpora

Pre technickú podporu kontaktujte:
- Email: podpora@obecny-odpadovy-system.sk
- GitHub Issues: [link-to-repo]/issues

## 📄 Licencia

Proprietárny softvér - všetky práva vyhradené.

## 🎉 Ďalšie kroky

Po úspešnom nasadení:
1. Otestujte registračný proces
2. Vytvorte testovacie dáta
3. Vygenerujte testovací report
4. Otestujte Stripe platbu v test mode
5. Prepnite Stripe do live mode
6. Spustite marketing kampaň pre obce

---

**Vytvorené s ❤️ pre slovenské obce**
