import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Overenie tokenu
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Získanie obce prihláseného starostu
  const { data: obec, error: obecError } = await supabase
    .from('obce')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (obecError || !obec) {
    return res.status(404).json({ error: 'Obec not found' });
  }

  // GET - načítanie všetkých udalostí harmonogramu pre obec
  if (req.method === 'GET') {
    const { mesiac, rok } = req.query;
    
    let query = supabase
      .from('harmonogram')
      .select('*')
      .eq('obec_id', obec.id)
      .order('datum', { ascending: true });

    // Filtrovanie podľa mesiaca a roku (voliteľné)
    if (mesiac && rok) {
      const startDate = new Date(rok, mesiac - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(rok, mesiac, 0).toISOString().split('T')[0];
      query = query.gte('datum', startDate).lte('datum', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  // POST - pridanie novej udalosti
  if (req.method === 'POST') {
    const { datum, typ_odpadu, poznamka } = req.body;

    if (!datum || !typ_odpadu) {
      return res.status(400).json({ error: 'Dátum a typ odpadu sú povinné' });
    }

    // Kontrola, či už neexistuje záznam pre tento deň a typ
    const { data: existing, error: checkError } = await supabase
      .from('harmonogram')
      .select('id')
      .eq('obec_id', obec.id)
      .eq('datum', datum)
      .eq('typ_odpadu', typ_odpadu)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Pre tento deň už existuje záznam pre vybraný typ odpadu' });
    }

    const { data, error } = await supabase
      .from('harmonogram')
      .insert([{
        obec_id: obec.id,
        datum,
        typ_odpadu,
        poznamka: poznamka || null
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}