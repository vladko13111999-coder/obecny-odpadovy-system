# Aktualizácia pre ISOH systém - Slovenská republika

## Prehľad zmien

Tento dokument popisuje aktualizácie systému pre podporu nového zákona o triedení odpadu platného od 1.1.2027 a správne formáty pre systém ISOH (Informačný systém odpadového hospodárstva).

## Problémy, ktoré boli opravené

1. **Chýbajúce polia v databáze**: Pridané polia `kod_odpadu` a `kod_nakladania` do tabuľky `vyvozy`
2. **Chýbajúce polia v tabuľke obce**: Pridané polia `ico`, `ulica`, `mesto`, `psc` pre správne reportovanie
3. **Problém s dátumami 2027+**: Opravené výpočty dátumov pre budúce roky pomocou UTC
4. **Nesprávny XML formát**: Aktualizovaný XML formát podľa ISOH požiadaviek
5. **Chýbajúce mapovanie kódov**: Automatické mapovanie typov odpadu na kódy podľa Európskeho katalógu odpadov (EWC)

## Inštalácia

### Krok 1: Aktualizácia databázy

Máte tri možnosti, ako spustiť migráciu:

#### Možnosť A: Webové rozhranie (Najjednoduchšie) ⭐

1. Spustite aplikáciu: `pnpm dev`
2. Prihláste sa do dashboardu
3. Prejdite na `/dashboard/migracia` (alebo kliknite na "Migrácia" v navigácii)
4. Kliknite na "Zobraziť SQL skript"
5. Skopírujte SQL skript
6. Otvorte Supabase Dashboard → SQL Editor
7. Vložte a spustite skript

#### Možnosť B: Supabase SQL Editor (Odporúčané pre produkciu)

1. Otvorte Supabase Dashboard → SQL Editor
2. Skopírujte obsah súboru `supabase-schema-update.sql`
3. Vložte ho do SQL Editora a spustite

#### Možnosť C: API Endpoint

```bash
curl -X POST http://localhost:3000/api/migrate-database \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Poznámka**: API endpoint vyžaduje SERVICE_ROLE_KEY a môže nefungovať bez špeciálnej Supabase funkcie. Odporúčame použiť Možnosť A alebo B.

Tento skript:
- Pridá chýbajúce polia do tabuliek `obce` a `vyvozy`
- Aktualizuje existujúce záznamy s automatickými kódmi
- Aktualizuje trigger funkciu pre automatické nastavenie kódov pri vložení nového vývozu

### Krok 2: Overenie kódu

Kód bol aktualizovaný v nasledujúcich súboroch:
- `pages/api/generate-report.js` - Opravený report generátor
- `supabase-schema-update.sql` - Aktualizácia databázy

## Mapovanie kódov odpadu

Systém automaticky mapuje typy odpadu na kódy podľa legislatívy:

| Typ odpadu | Kód odpadu (EWC) | Kód nakladania | Názov |
|------------|------------------|----------------|-------|
| zmesovy    | 20 03 01         | D01            | Zmiešaný komunálny odpad |
| plast      | 20 01 39         | R03            | Plast - triedený komunálny odpad |
| papier     | 20 01 01         | R03            | Papier - triedený komunálny odpad |
| sklo       | 20 01 02         | R03            | Sklo - triedený komunálny odpad |

**Vysvetlenie kódov nakladania:**
- **D01**: Skladovanie na skládke
- **R03**: Recyklácia alebo regenerácia organických látok

## XML formát pre ISOH

XML súbory sú teraz generované v správnom formáte podľa ISOH požiadaviek:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Ohlasenie xmlns="http://www.isoh.gov.sk/schema/ohlasenie"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://www.isoh.gov.sk/schema/ohlasenie http://www.isoh.gov.sk/schema/ohlasenie.xsd">
  <Identifikacia>
    <TypDokladu>P</TypDokladu>
    <Rok>2027</Rok>
    <Kvartal>1</Kvartal>
    <DatumVytvorenia>2027-01-15</DatumVytvorenia>
  </Identifikacia>
  <Organizacia>
    <ICO>12345678</ICO>
    <Nazov>Názov obce</Nazov>
    <Adresa>
      <Ulica>Hlavná 1</Ulica>
      <Mesto>Bratislava</Mesto>
      <PSC>12345</PSC>
    </Adresa>
  </Organizacia>
  <NakladanieSOdpadom>
    <Zaznam>
      <KodOdpadu>20 01 01</KodOdpadu>
      <KodNakladania>R03</KodNakladania>
      <MnozstvoKG>1250.50</MnozstvoKG>
    </Zaznam>
  </NakladanieSOdpadom>
</Ohlasenie>
```

## CSV formát

CSV súbory používajú:
- Oddeľovač: `;` (stredník)
- Desatinná čiarka: `,` (čiarka)
- Kódovanie: UTF-8 s BOM

## Testovanie

Po aplikovaní zmien otestujte:

1. **Pridanie nového vývozu**: Kódy by sa mali automaticky nastaviť podľa typu odpadu
2. **Generovanie reportu pre rok 2027**: Malo by fungovať bez zamrznutia
3. **Kontrola XML formátu**: XML by mal byť validný a obsahovať všetky potrebné polia
4. **Kontrola CSV formátu**: CSV by mal používať správne oddeľovače a formátovanie

## Poznámky

- Kódy odpadu a nakladania sa automaticky nastavujú pri vložení nového vývozu
- Ak chcete manuálne zadať kódy, môžete aktualizovať trigger funkciu alebo pridať možnosť manuálneho výberu v UI
- Všetky dátumy sú teraz správne spracované pomocou UTC, čo zabezpečuje správne fungovanie aj pre budúce roky

## Podpora

Ak máte problémy alebo otázky, kontaktujte podporu na: podpora@obecny-odpadovy-system.sk
