import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API endpoint pre získanie migračného SQL skriptu
 * GET /api/get-migration-script
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Cesta k SQL súboru
    const sqlFilePath = join(process.cwd(), 'supabase-schema-update.sql');
    
    // Načítanie súboru
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    res.status(200).json({
      success: true,
      sql: sqlContent,
      filename: 'supabase-schema-update.sql'
    });
  } catch (error) {
    console.error('Chyba pri načítaní SQL skriptu:', error);
    res.status(500).json({ 
      error: 'Nepodarilo sa načítať SQL skript',
      message: error.message 
    });
  }
}
