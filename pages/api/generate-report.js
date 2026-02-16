import { createClient } from '@supabase/supabase-js'
import { stringify } from 'csv-stringify/sync';
import { Builder } from 'xml2js';
import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Získanie tokenu z hlavičky Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // 2. Vytvorenie Supabase klienta s tokenom
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 3. Overenie tokenu – získanie používateľa
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const { kvartal, rok } = req.body;

    if (!kvartal || !rok) {
      return res.status(400).json({ error: 'Missing kvartal or rok' });
    }

    if (kvartal < 1 || kvartal > 4) {
      return res.status(400).json({ error: 'Invalid kvartal (must be 1-4)' });
    }

    // 4. Získanie obce prihláseného používateľa
    const { data: obec, error: obecError } = await supabase
      .from('obce')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (obecError || !obec) {
      console.error('Obec error:', obecError);
      return res.status(404).json({ error: 'Municipality not found' });
    }

    // 5. Výpočet kvartálu
    const quarterStartMonth = (kvartal - 1) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    const startDate = new Date(rok, quarterStartMonth, 1);
    const endDate = new Date(rok, quarterEndMonth + 1, 0);

    // 6. Získanie vývozov za daný kvartál
    const { data: vyvozy, error: vyvozError } = await supabase
      .from('vyvozy')
      .select(`
        *,
        obyvatelia (meno, priezvisko, ulica, cislo_popisne)
      `)
      .eq('obec_id', obec.id)
      .gte('datum', startDate.toISOString().split('T')[0])
      .lte('datum', endDate.toISOString().split('T')[0])
      .order('datum', { ascending: true });

    if (vyvozError) {
      console.error('Vyvoz error:', vyvozError);
      throw vyvozError;
    }

    // 7. Agregácia dát podľa typu odpadu
    const aggregatedData = {
      zmesovy: 0,
      plast: 0,
      papier: 0,
      sklo: 0
    };

    vyvozy?.forEach(vyvoz => {
      aggregatedData[vyvoz.typ_odpadu] += parseFloat(vyvoz.mnozstvo_kg);
    });

    // 8. Generovanie CSV (opravené)
    const csvData = [
      { Obec: obec.nazov, Kvartál: kvartal, Rok: rok, Typ_odpadu: 'Zmiešaný odpad', Mnozstvo_kg: aggregatedData.zmesovy.toFixed(2).replace('.', ',') },
      { Obec: obec.nazov, Kvartál: kvartal, Rok: rok, Typ_odpadu: 'Plast', Mnozstvo_kg: aggregatedData.plast.toFixed(2).replace('.', ',') },
      { Obec: obec.nazov, Kvartál: kvartal, Rok: rok, Typ_odpadu: 'Papier', Mnozstvo_kg: aggregatedData.papier.toFixed(2).replace('.', ',') },
      { Obec: obec.nazov, Kvartál: kvartal, Rok: rok, Typ_odpadu: 'Sklo', Mnozstvo_kg: aggregatedData.sklo.toFixed(2).replace('.', ',') },
    ];

    const csvContent = stringify(csvData, {
      header: true,
      delimiter: ';',
      bom: true
    });

    // 9. Generovanie XML
    const xmlBuilder = new Builder({
      rootName: 'Report',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    const xmlData = {
      Municipality: obec.nazov,
      Quarter: kvartal,
      Year: rok,
      GeneratedDate: new Date().toISOString(),
      WasteData: {
        Waste: [
          { Type: 'zmesovy', Label: 'Zmiešaný odpad', Amount: aggregatedData.zmesovy.toFixed(2), Unit: 'kg' },
          { Type: 'plast', Label: 'Plast', Amount: aggregatedData.plast.toFixed(2), Unit: 'kg' },
          { Type: 'papier', Label: 'Papier', Amount: aggregatedData.papier.toFixed(2), Unit: 'kg' },
          { Type: 'sklo', Label: 'Sklo', Amount: aggregatedData.sklo.toFixed(2), Unit: 'kg' }
        ]
      },
      TotalCollections: vyvozy?.length || 0,
      Summary: {
        TotalWaste: Object.values(aggregatedData).reduce((a, b) => a + b, 0).toFixed(2),
        SortedWaste: (aggregatedData.plast + aggregatedData.papier + aggregatedData.sklo).toFixed(2),
        MixedWaste: aggregatedData.zmesovy.toFixed(2)
      }
    };

    const xmlContent = xmlBuilder.buildObject(xmlData);

    // 10. Generovanie XLSX
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Q${kvartal} ${rok}`);

    // Hlavička
    worksheet.addRow(['Obecný odpadový systém']).font = { bold: true, size: 14 };
    worksheet.addRow([`Obec: ${obec.nazov}`]);
    worksheet.addRow([`Kvartál: Q${kvartal} ${rok}`]);
    worksheet.addRow([]);

    // Hlavičky tabuľky
    const headerRow = worksheet.addRow(['Typ odpadu', 'Množstvo (kg)']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Dáta
    worksheet.addRow(['Zmiešaný odpad', aggregatedData.zmesovy]);
    worksheet.addRow(['Plast', aggregatedData.plast]);
    worksheet.addRow(['Papier', aggregatedData.papier]);
    worksheet.addRow(['Sklo', aggregatedData.sklo]);

    // Súhrn
    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['Celkom', Object.values(aggregatedData).reduce((a, b) => a + b, 0)]);
    totalRow.font = { bold: true };
    const sortedRow = worksheet.addRow(['Vytriedené (plast+papier+sklo)', 
      aggregatedData.plast + aggregatedData.papier + aggregatedData.sklo]);
    sortedRow.font = { bold: true };

    // Formátovanie čísel
    worksheet.getColumn(2).numFmt = '#,##0.00 "kg"';
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(1).width = 25;

    // Vygenerovať buffer a base64
    const buffer = await workbook.xlsx.writeBuffer();
    const xlsxBase64 = buffer.toString('base64');
    const xlsxDataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${xlsxBase64}`;

    // 11. Base64 pre ostatné formáty
    const csvBase64 = Buffer.from(csvContent).toString('base64');
    const xmlBase64 = Buffer.from(xmlContent).toString('base64');

    const csvDataUri = `data:text/csv;base64,${csvBase64}`;
    const xmlDataUri = `data:text/xml;base64,${xmlBase64}`;

    // 12. Uloženie do tabuľky reporty
    const { data: existingReport } = await supabase
      .from('reporty')
      .select('*')
      .eq('obec_id', obec.id)
      .eq('kvartal', kvartal)
      .eq('rok', rok)
      .maybeSingle();

    if (existingReport) {
      await supabase
        .from('reporty')
        .update({
          subor_csv: csvDataUri,
          subor_xml: xmlDataUri,
          subor_xlsx: xlsxDataUri,
          vygenerovane_dna: new Date().toISOString()
        })
        .eq('id', existingReport.id);
    } else {
      await supabase
        .from('reporty')
        .insert([{
          obec_id: obec.id,
          kvartal,
          rok,
          subor_csv: csvDataUri,
          subor_xml: xmlDataUri,
          subor_xlsx: xlsxDataUri
        }]);
    }

    res.status(200).json({
      success: true,
      csv: csvDataUri,
      xml: xmlDataUri,
      xlsx: xlsxDataUri,
      summary: {
        totalCollections: vyvozy?.length || 0,
        aggregatedData
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
}