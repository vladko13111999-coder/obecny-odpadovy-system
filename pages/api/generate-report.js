import { createClient } from '@supabase/supabase-js';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';

// Mapovanie typov odpadu na kódy podľa Európskeho katalógu odpadov (EWC) a slovenskej legislatívy
const WASTE_CODE_MAPPING = {
  'zmesovy': { kod: '20 03 01', nakladanie: 'D01', nazov: 'Zmiešaný komunálny odpad' },
  'plast': { kod: '20 01 39', nakladanie: 'R03', nazov: 'Plast - triedený komunálny odpad' },
  'papier': { kod: '20 01 01', nakladanie: 'R03', nazov: 'Papier - triedený komunálny odpad' },
  'sklo': { kod: '20 01 02', nakladanie: 'R03', nazov: 'Sklo - triedený komunálny odpad' }
};

// Funkcia na získanie kódu odpadu a nakladania
function getWasteCodes(typOdpadu, kodOdpadu, kodNakladania) {
  if (kodOdpadu && kodNakladania) {
    return { kod: kodOdpadu, nakladanie: kodNakladania };
  }
  const mapping = WASTE_CODE_MAPPING[typOdpadu];
  return mapping || { kod: kodOdpadu || '20 03 01', nakladanie: kodNakladania || 'D01' };
}

// Funkcia na escapovanie XML znakov
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Overenie tokenu
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Získanie údajov o obci
    const { data: obec, error: obecError } = await supabase
      .from('obce')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (obecError || !obec) return res.status(404).json({ error: 'Obec nenájdená' });

    const { kvartal, rok } = req.body;
    if (!kvartal || !rok) return res.status(400).json({ error: 'Chýba kvartál alebo rok' });

    // Validácia kvartálu a roka
    if (kvartal < 1 || kvartal > 4) return res.status(400).json({ error: 'Neplatný kvartál' });
    if (rok < 2000 || rok > 2100) return res.status(400).json({ error: 'Neplatný rok' });

    // Výpočet kvartálu - opravené pre roky 2027+
    const quarterStartMonth = (kvartal - 1) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    // Použitie UTC dátumu pre správne výpočty aj pre budúce roky
    const startDate = new Date(Date.UTC(rok, quarterStartMonth, 1));
    const endDate = new Date(Date.UTC(rok, quarterEndMonth + 1, 0, 23, 59, 59));
    
    // Formátovanie dátumov pre databázu (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Získanie všetkých vývozov za obdobie
    const { data: vyvozy, error: vyvozError } = await supabase
      .from('vyvozy')
      .select('*')
      .eq('obec_id', obec.id)
      .gte('datum', startDateStr)
      .lte('datum', endDateStr);

    if (vyvozError) throw vyvozError;

    if (!vyvozy || vyvozy.length === 0) {
      return res.status(200).json({
        success: true,
        xml: null,
        csv: null,
        xlsx: null,
        summary: {
          totalCollections: 0,
          totalKg: '0.00',
          message: 'Pre vybrané obdobie nie sú žiadne vývozy'
        }
      });
    }

    // Agregácia podľa (kod_odpadu, kod_nakladania) s automatickým mapovaním
    const aggregated = {};
    vyvozy.forEach(v => {
      const codes = getWasteCodes(v.typ_odpadu, v.kod_odpadu, v.kod_nakladania);
      const key = `${codes.kod}_${codes.nakladanie}`;
      
      if (!aggregated[key]) {
        aggregated[key] = {
          kod_odpadu: codes.kod,
          nazov_odpadu: WASTE_CODE_MAPPING[v.typ_odpadu]?.nazov || v.typ_odpadu,
          kod_nakladania: codes.nakladanie,
          celkom_kg: 0
        };
      }
      aggregated[key].celkom_kg += parseFloat(v.mnozstvo_kg || 0);
    });

    const aggregatedArray = Object.values(aggregated).filter(item => item.celkom_kg > 0);

    // 1. Vytvorenie XML podľa ISOH formátu pre Slovensko
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlContent += `<Ohlasenie xmlns="http://www.isoh.gov.sk/schema/ohlasenie" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.isoh.gov.sk/schema/ohlasenie http://www.isoh.gov.sk/schema/ohlasenie.xsd">\n`;
    xmlContent += `  <Identifikacia>\n`;
    xmlContent += `    <TypDokladu>P</TypDokladu>\n`;
    xmlContent += `    <Rok>${rok}</Rok>\n`;
    xmlContent += `    <Kvartal>${kvartal}</Kvartal>\n`;
    xmlContent += `    <DatumVytvorenia>${formattedDate}</DatumVytvorenia>\n`;
    xmlContent += `  </Identifikacia>\n`;
    xmlContent += `  <Organizacia>\n`;
    xmlContent += `    <ICO>${obec.ico || ''}</ICO>\n`;
    xmlContent += `    <Nazov>${escapeXml(obec.nazov || '')}</Nazov>\n`;
    xmlContent += `    <Adresa>\n`;
    xmlContent += `      <Ulica>${escapeXml(obec.ulica || '')}</Ulica>\n`;
    xmlContent += `      <Mesto>${escapeXml(obec.mesto || '')}</Mesto>\n`;
    xmlContent += `      <PSC>${obec.psc || ''}</PSC>\n`;
    xmlContent += `    </Adresa>\n`;
    xmlContent += `  </Organizacia>\n`;
    xmlContent += `  <NakladanieSOdpadom>\n`;
    
    aggregatedArray.forEach(item => {
      xmlContent += `    <Zaznam>\n`;
      xmlContent += `      <KodOdpadu>${item.kod_odpadu}</KodOdpadu>\n`;
      xmlContent += `      <KodNakladania>${item.kod_nakladania}</KodNakladania>\n`;
      xmlContent += `      <MnozstvoKG>${parseFloat(item.celkom_kg).toFixed(2)}</MnozstvoKG>\n`;
      xmlContent += `    </Zaznam>\n`;
    });
    
    xmlContent += `  </NakladanieSOdpadom>\n`;
    xmlContent += `</Ohlasenie>`;
    const xmlBase64 = Buffer.from(xmlContent, 'utf8').toString('base64');
    const xmlDataUri = `data:text/xml;charset=utf-8;base64,${xmlBase64}`;

    // 2. CSV podľa slovenského formátu (oddeľovač ;, desatinná čiarka)
    const csvData = [
      ['Kód odpadu', 'Kód nakladania', 'Množstvo (kg)'],
      ...aggregatedArray.map(item => [
        item.kod_odpadu,
        item.kod_nakladania,
        parseFloat(item.celkom_kg).toFixed(2).replace('.', ',')
      ])
    ];
    const csvContent = stringify(csvData, { 
      delimiter: ';', 
      bom: true,
      header: false,
      quoted: false
    });
    const csvBase64 = Buffer.from(csvContent, 'utf8').toString('base64');
    const csvDataUri = `data:text/csv;charset=utf-8;base64,${csvBase64}`;

    // 3. XLSX s formátovaním
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Report Q${kvartal} ${rok}`);
    
    const headerRow = worksheet.addRow(['Kód odpadu', 'Kód nakladania', 'Množstvo (kg)']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    aggregatedArray.forEach(item => {
      const row = worksheet.addRow([
        item.kod_odpadu,
        item.kod_nakladania,
        parseFloat(item.celkom_kg)
      ]);
      row.getCell(3).numFmt = '0.00';
    });
    
    worksheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    const xlsxBase64 = buffer.toString('base64');
    const xlsxDataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${xlsxBase64}`;

    // 4. Uloženie do tabuľky reporty s riadnym ošetrením chýb
    try {
      console.log(`Ukladám report pre obec ${obec.id}, kvartál ${kvartal}, rok ${rok}`);

      const { data: existingReport, error: selectError } = await supabase
        .from('reporty')
        .select('id')
        .eq('obec_id', obec.id)
        .eq('kvartal', kvartal)
        .eq('rok', rok)
        .maybeSingle();

      if (selectError) {
        console.error('Chyba pri kontrole existencie reportu:', selectError);
      } else {
        if (existingReport) {
          const { error: updateError } = await supabase
            .from('reporty')
            .update({
              subor_csv: csvDataUri,
              subor_xml: xmlDataUri,
              subor_xlsx: xlsxDataUri,
              vygenerovane_dna: new Date().toISOString()
            })
            .eq('id', existingReport.id);

          if (updateError) {
            console.error('Chyba pri update reportu:', updateError);
          } else {
            console.log('Report úspešne aktualizovaný');
          }
        } else {
          const { error: insertError } = await supabase
            .from('reporty')
            .insert([{
              obec_id: obec.id,
              kvartal,
              rok,
              subor_csv: csvDataUri,
              subor_xml: xmlDataUri,
              subor_xlsx: xlsxDataUri
            }]);

          if (insertError) {
            console.error('Chyba pri insert reportu:', insertError);
          } else {
            console.log('Report úspešne vložený');
          }
        }
      }
    } catch (dbError) {
      console.error('Výnimka pri ukladaní reportu do DB:', dbError);
    }

    res.status(200).json({
      success: true,
      xml: xmlDataUri,
      csv: csvDataUri,
      xlsx: xlsxDataUri,
      summary: {
        totalCollections: vyvozy.length,
        totalKg: aggregatedArray.reduce((sum, i) => sum + i.celkom_kg, 0).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Chyba pri generovaní reportu:', error);
    res.status(500).json({ error: error.message });
  }
