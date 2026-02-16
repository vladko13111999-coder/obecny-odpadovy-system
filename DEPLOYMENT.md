# Deployment Guide - Obecný odpadový systém

Tento dokument obsahuje podrobný návod na nasadenie aplikácie do produkčného prostredia.

## 📋 Pred nasadením - Checklist

- [ ] Vytvorený Supabase projekt
- [ ] Spustená databázová schéma (`supabase-schema.sql`)
- [ ] Vytvorený Supabase Storage bucket `reports`
- [ ] Nastavené RLS politiky v Supabase
- [ ] Vytvorený Stripe účet
- [ ] Vytvorené 3 produkty v Stripe (Small, Medium, Large)
- [ ] Skopírované Stripe Price IDs
- [ ] Pripravené všetky environment variables

## 🚀 Nasadenie na Vercel

### Krok 1: Príprava GitHub repozitára

```bash
cd obecny-odpadovy-system
git init
git add .
git commit -m "Initial commit - Obecný odpadový systém"
git branch -M main
git remote add origin https://github.com/your-username/obecny-odpadovy-system.git
git push -u origin main
```

### Krok 2: Import do Vercel

1. Prejdite na https://vercel.com
2. Kliknite "Add New Project"
3. Importujte GitHub repozitár
4. Framework Preset: **Next.js** (automaticky detekované)
5. Root Directory: `./`
6. Build Command: `pnpm build` (default)
7. Output Directory: `.next` (default)

### Krok 3: Nastavenie Environment Variables

V Vercel Dashboard → Settings → Environment Variables pridajte:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_SMALL=price_xxx
STRIPE_PRICE_ID_MEDIUM=price_xxx
STRIPE_PRICE_ID_LARGE=price_xxx
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Dôležité:** Použite **Production** environment pre všetky premenné.

### Krok 4: Deploy

1. Kliknite "Deploy"
2. Počkajte na dokončenie buildu (cca 2-3 minúty)
3. Skopírujte produkčnú URL (napr. `https://obecny-odpadovy-system.vercel.app`)

### Krok 5: Nastavenie Stripe Webhooku

1. Prejdite do Stripe Dashboard → Developers → Webhooks
2. Kliknite "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Vyberte udalosti:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Kliknite "Add endpoint"
6. Skopírujte **Signing secret** (začína `whsec_`)
7. Aktualizujte `STRIPE_WEBHOOK_SECRET` v Vercel Environment Variables
8. Redeploy aplikáciu

### Krok 6: Testovanie

1. Otvorte produkčnú URL
2. Zaregistrujte testovaciu obec
3. Pridajte obyvateľa
4. Pridajte vývoz
5. Vygenerujte report
6. Otestujte Stripe platbu (použite testovaciu kartu `4242 4242 4242 4242`)

## 🌐 Vlastná doména

### Pridanie vlastnej domény vo Vercel

1. V Vercel Dashboard → Settings → Domains
2. Pridajte vašu doménu (napr. `odpadovy-system.sk`)
3. Nastavte DNS záznamy podľa inštrukcií Vercel:
   - **A záznam**: `76.76.21.21`
   - **CNAME záznam**: `cname.vercel-dns.com`
4. Počkajte na propagáciu DNS (5-60 minút)
5. Aktualizujte `NEXT_PUBLIC_APP_URL` na novú doménu
6. Aktualizujte Stripe webhook URL

## 🔧 Alternatívne platformy

### Netlify

```bash
# Vytvorte netlify.toml
[build]
  command = "pnpm build"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

Potom:
1. Importujte projekt do Netlify
2. Nastavte environment variables
3. Deploy

### Railway

1. Vytvorte nový projekt na https://railway.app
2. Pripojte GitHub repozitár
3. Nastavte environment variables
4. Railway automaticky detekuje Next.js a deployuje

### Docker (Self-hosted)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build a spustenie:
```bash
docker build -t obecny-odpadovy-system .
docker run -p 3000:3000 --env-file .env.local obecny-odpadovy-system
```

## 🔒 Bezpečnostné odporúčania

### 1. Environment Variables
- **Nikdy** necommitujte `.env.local` do Git
- Používajte silné, náhodné hodnoty pre secrets
- Rotujte API kľúče pravidelne

### 2. Supabase
- Aktivujte RLS na všetkých tabuľkách
- Používajte Service Role Key len na serveri
- Nastavte rate limiting v Supabase Dashboard

### 3. Stripe
- Používajte live keys len v produkcii
- Nastavte webhook signing secret
- Monitorujte podozrivé platby

### 4. Next.js
- Používajte HTTPS (automaticky na Vercel)
- Nastavte security headers v `next.config.mjs`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

## 📊 Monitoring a Analytics

### Vercel Analytics

1. V Vercel Dashboard → Analytics
2. Aktivujte Analytics
3. Sledujte:
   - Page views
   - Performance metrics
   - Error rates

### Supabase Monitoring

1. V Supabase Dashboard → Database → Logs
2. Sledujte:
   - Query performance
   - Error logs
   - API usage

### Stripe Dashboard

1. Sledujte:
   - Successful payments
   - Failed payments
   - Subscription churn

## 🐛 Debugging v produkcii

### Vercel Logs

```bash
# Nainštalujte Vercel CLI
npm i -g vercel

# Prihláste sa
vercel login

# Zobrazenie logov
vercel logs
```

### Supabase Logs

1. Prejdite do Supabase Dashboard
2. Database → Logs
3. Filtrujte podľa severity (Error, Warning)

### Stripe Logs

1. Stripe Dashboard → Developers → Logs
2. Sledujte webhook deliveries
3. Skontrolujte failed requests

## 🔄 Continuous Deployment

Vercel automaticky deployuje pri každom push do `main` branch:

```bash
# Vývoj
git checkout -b feature/nova-funkcia
# ... práca na funkcii
git commit -am "Pridaná nová funkcia"
git push origin feature/nova-funkcia

# Merge do main
git checkout main
git merge feature/nova-funkcia
git push origin main
# → Automatický deploy na Vercel
```

## 📈 Škálovanie

### Vercel
- **Hobby plan**: 100GB bandwidth, 100 deployments/mesiac
- **Pro plan**: 1TB bandwidth, unlimited deployments
- Automatické škálovanie Edge Functions

### Supabase
- **Free tier**: 500MB database, 1GB bandwidth
- **Pro tier**: 8GB database, 50GB bandwidth
- **Enterprise**: Neobmedzené, vlastná infraštruktúra

### Stripe
- Žiadne limity na počet transakcií
- Poplatky: 1.4% + 0.25€ za transakciu (EU karty)

## 🎉 Po úspešnom nasadení

1. ✅ Otestujte všetky funkcie
2. ✅ Nastavte monitoring a alerting
3. ✅ Vytvorte zálohovací plán databázy
4. ✅ Dokumentujte prístupové údaje
5. ✅ Informujte používateľov o spustení

---

**Poznámka:** Tento deployment guide predpokladá použitie Vercel ako hlavnej platformy. Pre iné platformy postupujte podľa ich oficiálnej dokumentácie.
