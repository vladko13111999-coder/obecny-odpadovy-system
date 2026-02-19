import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint pre migráciu databázy
 * Spustí SQL skripty na aktualizáciu schémy pre ISOH podporu
 * 
 * Použitie:
 * POST /api/migrate-database
 * Headers: Authorization: Bearer <service_role_key>
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Overenie autentifikácie - používa sa SERVICE_ROLE_KEY
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!token || token !== serviceRoleKey) {
      return res.status(401).json({ error: 'Unauthorized - vyžaduje sa SERVICE_ROLE_KEY' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return res.status(500).json({ error: 'NEXT_PUBLIC_SUPABASE_URL nie je nastavená' });
    }

    // Vytvorenie admin klienta
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // SQL skripty na migráciu
    const migrationScripts = [
      // 1. Pridanie chýbajúcich polí do tabuľky obce
      `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obce' AND column_name='ico') THEN
          ALTER TABLE obce ADD COLUMN ico TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obce' AND column_name='ulica') THEN
          ALTER TABLE obce ADD COLUMN ulica TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obce' AND column_name='mesto') THEN
          ALTER TABLE obce ADD COLUMN mesto TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obce' AND column_name='psc') THEN
          ALTER TABLE obce ADD COLUMN psc TEXT;
        END IF;
      END $$;
      `,

      // 2. Pridanie polí pre kódy odpadu a nakladania do tabuľky vyvozy
      `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vyvozy' AND column_name='kod_odpadu') THEN
          ALTER TABLE vyvozy ADD COLUMN kod_odpadu TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vyvozy' AND column_name='kod_nakladania') THEN
          ALTER TABLE vyvozy ADD COLUMN kod_nakladania TEXT;
        END IF;
      END $$;
      `,

      // 3. Aktualizácia existujúcich záznamov - mapovanie typov odpadu na kódy
      `
      UPDATE vyvozy 
      SET kod_odpadu = '20 03 01', kod_nakladania = 'D01'
      WHERE typ_odpadu = 'zmesovy' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);
      
      UPDATE vyvozy 
      SET kod_odpadu = '20 01 39', kod_nakladania = 'R03'
      WHERE typ_odpadu = 'plast' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);
      
      UPDATE vyvozy 
      SET kod_odpadu = '20 01 01', kod_nakladania = 'R03'
      WHERE typ_odpadu = 'papier' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);
      
      UPDATE vyvozy 
      SET kod_odpadu = '20 01 02', kod_nakladania = 'R03'
      WHERE typ_odpadu = 'sklo' AND (kod_odpadu IS NULL OR kod_nakladania IS NULL);
      `,

      // 4. Vytvorenie indexov
      `
      CREATE INDEX IF NOT EXISTS idx_vyvozy_kod_odpadu ON vyvozy(kod_odpadu);
      CREATE INDEX IF NOT EXISTS idx_vyvozy_kod_nakladania ON vyvozy(kod_nakladania);
      `,

      // 5. Aktualizácia trigger funkcie pre automatické nastavenie kódov
      `
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
      `,

      // 6. Pridanie subor_xlsx do tabuľky reporty ak chýba
      `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reporty' AND column_name='subor_xlsx') THEN
          ALTER TABLE reporty ADD COLUMN subor_xlsx TEXT;
        END IF;
      END $$;
      `
    ];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Spustenie každého skriptu
    for (let i = 0; i < migrationScripts.length; i++) {
      try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: migrationScripts[i]
        });

        if (error) {
          // Skúsime alternatívny spôsob - priamy SQL cez REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ sql: migrationScripts[i] })
          });

          if (!response.ok) {
            // Ak neexistuje exec_sql funkcia, použijeme Supabase Management API alebo vrátime inštrukcie
            results.push({
              step: i + 1,
              status: 'skipped',
              message: 'Vyžaduje sa manuálne spustenie v SQL Editore',
              sql: migrationScripts[i].substring(0, 100) + '...'
            });
            continue;
          }
        }

        results.push({
          step: i + 1,
          status: 'success',
          message: `Migrácia ${i + 1} úspešná`
        });
        successCount++;
      } catch (err) {
        results.push({
          step: i + 1,
          status: 'error',
          message: err.message,
          sql: migrationScripts[i].substring(0, 100) + '...'
        });
        errorCount++;
      }
    }

    // Ak niektoré migrácie zlyhali, vrátime inštrukcie
    if (errorCount > 0 || successCount === 0) {
      return res.status(207).json({
        success: false,
        message: 'Niektoré migrácie zlyhali. Použite SQL Editor v Supabase.',
        results,
        instructions: {
          method: 'SQL Editor',
          steps: [
            '1. Otvorte Supabase Dashboard',
            '2. Prejdite na SQL Editor',
            '3. Skopírujte obsah súboru supabase-schema-update.sql',
            '4. Spustite skript'
          ]
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Migrácia úspešne dokončená',
      results,
      summary: {
        total: migrationScripts.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error('Chyba pri migrácii:', error);
    res.status(500).json({
      error: error.message,
      message: 'Migrácia zlyhala. Použite SQL Editor v Supabase Dashboard.',
      fallback: 'Skopírujte obsah súboru supabase-schema-update.sql a spustite ho v Supabase SQL Editore.'
    });
  }
}
