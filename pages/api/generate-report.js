import MnozstvaForm from '../components/MnozstvaForm';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateISOHXML(obecId: number, rok: number, mesiac: number): Promise<string> {
  // 1. Získať údaje o obci
  const { data: obec } = await supabase
    .from('obce')
    .select('*')
    .eq('id', obecId)
    .single();

  // 2. Nastaviť obdobie (prvý a posledný deň v mesiaci)
  const zaciatok = `${rok}-${String(mesiac).padStart(2, '0')}-01`;
  const koniec = new Date(rok, mesiac, 0).toISOString().split('T')[0];

  // 3. Získať množstvá odpadov za dané obdobie
  const { data: mnozstva } = await supabase
    .from('mnozstva_odpadov')
    .select(`
      *,
      druh_odpadu:druhy_odpadov(kod, nazov),
      sposob_nakladania:sposoby_nakladania(kod, typ)
    `)
    .eq('obec_id', obecId)
    .gte('datum_od', zaciatok)
    .lte('datum_do', koniec);

  // 4. Zostaviť XML
  return buildXML(obec, zaciatok, koniec, mnozstva || []);
}

function buildXML(obec: any, od: string, do_: string, polozky: any[]): string {
  const polozkyXML = polozky.map(p => `
    <polozka>
      <kod_odpadu>${p.druh_odpadu.kod}</kod_odpadu>
      <nazov_odpadu>${p.druh_odpadu.nazov}</nazov_odpadu>
      <mnozstvo>${p.mnozstvo}</mnozstvo>
      <jednotka>t</jednotka>
      <kod_nakladania>${p.sposob_nakladania.kod}</kod_nakladania>
      <typ_nakladania>${p.sposob_nakladania.typ}</typ_nakladania>
    </polozka>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<odpadovy_report>
  <identifikacia>
    <obec>${obec.nazov}</obec>
    <ico>${obec.ico || ''}</ico>
    <psc>${obec.psc || ''}</psc>
    <adresa>${obec.adresa || ''}</adresa>
  </identifikacia>
  <obdobie>
    <od>${od}</od>
    <do>${do_}</do>
  </obdobie>
  <odpady>
    ${polozkyXML}
  </odpady>
</odpadovy_report>`;
}