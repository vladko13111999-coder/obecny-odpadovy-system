#!/usr/bin/env node

/**
 * CLI skript pre migráciu databázy
 * Použitie: node scripts/migrate.js
 * 
 * Vyžaduje: SUPABASE_SERVICE_ROLE_KEY v .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Načítanie environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Chýbajú SUPABASE credentials v .env.local');
  console.error('Potrebné: NEXT_PUBLIC_SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  console.log('🚀 Spúšťam migráciu databázy...\n');

  try {
    // Načítanie SQL skriptu
    const sqlFile = join(__dirname, '..', 'supabase-schema-update.sql');
    const sqlContent = readFileSync(sqlFile, 'utf8');

    // Rozdelenie na jednotlivé príkazy
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Našiel som ${statements.length} SQL príkazov\n`);

    // Spustenie každého príkazu
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      try {
        console.log(`⏳ Spúšťam príkaz ${i + 1}/${statements.length}...`);
        
        // Použitie Supabase REST API pre SQL príkazy
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ sql: statement })
        });

        if (response.ok) {
          console.log(`✅ Príkaz ${i + 1} úspešný\n`);
        } else {
          const errorText = await response.text();
          console.log(`⚠️  Príkaz ${i + 1} preskočený: ${errorText.substring(0, 100)}\n`);
        }
      } catch (err) {
        console.log(`⚠️  Príkaz ${i + 1} preskočený: ${err.message}\n`);
      }
    }

    console.log('✅ Migrácia dokončená!');
    console.log('\n💡 Tip: Skontrolujte výsledky v Supabase Dashboard → SQL Editor');

  } catch (error) {
    console.error('❌ Chyba pri migrácii:', error.message);
    console.error('\n💡 Alternatíva: Spustite supabase-schema-update.sql manuálne v Supabase SQL Editore');
    process.exit(1);
  }
}

runMigration();
