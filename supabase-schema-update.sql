-- Aktualizácia schémy pre podporu ISOH reportovania podľa slovenskej legislatívy
-- Spustiť v Supabase SQL Editore

-- 1. Pridanie chýbajúcich polí do tabuľky obce
ALTER TABLE obce 
ADD COLUMN IF NOT EXISTS ico TEXT,
ADD COLUMN IF NOT EXISTS ulica TEXT,
ADD COLUMN IF NOT EXISTS mesto TEXT,
ADD COLUMN IF NOT EXISTS psc TEXT;

-- 2. Pridanie polí pre kódy odpadu a nakladania do tabuľky vyvozy
ALTER TABLE vyvozy 
ADD COLUMN IF NOT EXISTS kod_odpadu TEXT,
ADD COLUMN IF NOT EXISTS kod_nakladania TEXT;

-- 3. Aktualizácia existujúcich záznamov - mapovanie typov odpadu na kódy podľa legislatívy
-- Podľa Európskeho katalógu odpadov (EWC) a slovenskej legislatívy

-- Zmiešaný komunálny odpad
UPDATE vyvozy 
SET kod_odpadu = '20 03 01', kod_nakladania = 'D01'
WHERE typ_odpadu = 'zmesovy' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);

-- Plast - triedený komunálny odpad
UPDATE vyvozy 
SET kod_odpadu = '20 01 39', kod_nakladania = 'R03'
WHERE typ_odpadu = 'plast' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);

-- Papier - triedený komunálny odpad
UPDATE vyvozy 
SET kod_odpadu = '20 01 01', kod_nakladania = 'R03'
WHERE typ_odpadu = 'papier' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);

-- Sklo - triedený komunálny odpad
UPDATE vyvozy 
SET kod_odpadu = '20 01 02', kod_nakladania = 'R03'
WHERE typ_odpadu = 'sklo' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);

-- 4. Vytvorenie indexov pre lepšiu výkonnosť
CREATE INDEX IF NOT EXISTS idx_vyvozy_kod_odpadu ON vyvozy(kod_odpadu);
CREATE INDEX IF NOT EXISTS idx_vyvozy_kod_nakladania ON vyvozy(kod_nakladania);

-- 5. Komentáre k poľám
COMMENT ON COLUMN vyvozy.kod_odpadu IS 'Kód odpadu podľa Európskeho katalógu odpadov (EWC)';
COMMENT ON COLUMN vyvozy.kod_nakladania IS 'Kód nakladania s odpadom podľa slovenskej legislatívy (D01=skladovanie, R03=recyklácia)';

-- 6. Aktualizácia trigger funkcie pre automatické nastavenie kódov
CREATE OR REPLACE FUNCTION calculate_waste_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate points: 2 points per kg for sorted waste (plast, papier, sklo), 0 for zmesovy
    IF NEW.typ_odpadu IN ('plast', 'papier', 'sklo') THEN
        NEW.body := ROUND(NEW.mnozstvo_kg * 2);
    ELSE
        NEW.body := 0;
    END IF;
    
    -- Automatické nastavenie kódov odpadu a nakladania ak nie sú zadané
    IF NEW.kod_odpadu IS NULL OR NEW.kod_nakladania IS NULL THEN
        CASE NEW.typ_odpadu
            WHEN 'zmesovy' THEN
                NEW.kod_odpadu := '20 03 01';
                NEW.kod_nakladania := 'D01';
            WHEN 'plast' THEN
                NEW.kod_odpadu := '20 01 39';
                NEW.kod_nakladania := 'R03';
            WHEN 'papier' THEN
                NEW.kod_odpadu := '20 01 01';
                NEW.kod_nakladania := 'R03';
            WHEN 'sklo' THEN
                NEW.kod_odpadu := '20 01 02';
                NEW.kod_nakladania := 'R03';
        END CASE;
    END IF;
    
    -- Update total points for the resident
    UPDATE obyvatelia 
    SET celkove_body = (
        SELECT COALESCE(SUM(body), 0) 
        FROM vyvozy 
        WHERE obyvatel_id = NEW.obyvatel_id
    ) + NEW.body
    WHERE id = NEW.obyvatel_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
