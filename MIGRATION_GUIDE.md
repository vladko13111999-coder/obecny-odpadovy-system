# Návod na migráciu databázy

Tento dokument popisuje tri spôsoby, ako spustiť migráciu databázy pre podporu ISOH systému.

## Metóda 1: Supabase SQL Editor (Odporúčané) ⭐

Najjednoduchší a najspoľahlivejší spôsob:

1. **Otvorte Supabase Dashboard**
   - Prejdite na https://supabase.com/dashboard
   - Vyberte váš projekt

2. **Otvorte SQL Editor**
   - V ľavom menu kliknite na "SQL Editor"
   - Alebo použite klávesovú skratku: `Ctrl/Cmd + K` → "SQL Editor"

3. **Skopírujte SQL skript**
   - Otvorte súbor `supabase-schema-update.sql` v projekte
   - Skopírujte celý obsah (Ctrl/Cmd + A, potom Ctrl/Cmd + C)

4. **Spustite skript**
   - Vložte skript do SQL Editora (Ctrl/Cmd + V)
   - Kliknite na tlačidlo "Run" alebo stlačte `Ctrl/Cmd + Enter`
   - Počkajte na dokončenie (zvyčajne 1-2 sekundy)

5. **Overenie**
   - Skontrolujte, či sa zobrazila správa "Success"
   - V ľavom menu prejdite na "Table Editor" a overte, či tabuľky `obce` a `vyvozy` majú nové stĺpce

## Metóda 2: API Endpoint

Ak máte nastavený `SUPABASE_SERVICE_ROLE_KEY`, môžete použiť API endpoint:

### Krok 1: Spustite vývojový server

```bash
pnpm dev
```

### Krok 2: Spustite migráciu

```bash
curl -X POST http://localhost:3000/api/migrate-database \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Alebo použite Postman/Insomnia:
- **URL**: `http://localhost:3000/api/migrate-database`
- **Method**: `POST`
- **Headers**: 
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`

**Poznámka**: Nahraďte `YOUR_SERVICE_ROLE_KEY` skutočným SERVICE_ROLE_KEY z vašej `.env.local` súboru.

## Metóda 3: Supabase CLI

Ak máte nainštalovaný Supabase CLI:

### Krok 1: Inštalácia Supabase CLI

```bash
npm install -g supabase
```

### Krok 2: Prihlásenie

```bash
supabase login
```

### Krok 3: Linkovanie projektu

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Krok 4: Spustenie migrácie

```bash
supabase db push
```

Alebo manuálne:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase-schema-update.sql
```

## Overenie migrácie

Po spustení migrácie overte nasledovné:

### 1. Kontrola nových stĺpcov v tabuľke `obce`

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'obce' 
AND column_name IN ('ico', 'ulica', 'mesto', 'psc');
```

Mali by ste vidieť 4 riadky.

### 2. Kontrola nových stĺpcov v tabuľke `vyvozy`

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vyvozy' 
AND column_name IN ('kod_odpadu', 'kod_nakladania');
```

Mali by ste vidieť 2 riadky.

### 3. Kontrola trigger funkcie

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'calculate_waste_points';
```

Mala by sa zobraziť aktualizovaná funkcia s automatickým nastavením kódov.

### 4. Testovanie automatického nastavenia kódov

Vytvorte nový vývoz cez aplikáciu a skontrolujte, či sa automaticky nastavili `kod_odpadu` a `kod_nakladania`.

## Riešenie problémov

### Chyba: "relation already exists"
- Táto chyba je normálna, ak už migrácia bola spustená
- Môžete ju ignorovať alebo použiť `IF NOT EXISTS` v SQL príkazoch

### Chyba: "permission denied"
- Uistite sa, že používate správny SERVICE_ROLE_KEY
- Skontrolujte RLS politiky v Supabase

### Chyba: "column already exists"
- Stĺpec už existuje, migrácia bola už spustená
- Môžete pokračovať alebo preskočiť tento krok

## Potrebujete pomoc?

Ak máte problémy s migráciou:
1. Skontrolujte Supabase Dashboard → Logs pre chybové hlásenia
2. Použite Metódu 1 (SQL Editor) - je najspoľahlivejšia
3. Kontaktujte podporu: podpora@obecny-odpadovy-system.sk
