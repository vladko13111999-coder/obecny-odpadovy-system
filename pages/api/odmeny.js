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

  // GET - načítanie odmien
  if (req.method === 'GET') {
    const { data: odmeny, error } = await supabase
      .from('odmeny')
      .select('*')
      .eq('obec_id', obec.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(odmeny);
  }

  // POST - pridanie novej odmeny
  if (req.method === 'POST') {
    const { nazov, popis, cena_v_bodoch, obrazok_url } = req.body;

    if (!nazov || !cena_v_bodoch) {
      return res.status(400).json({ error: 'Názov a cena sú povinné' });
    }

    const { data, error } = await supabase
      .from('odmeny')
      .insert([{
        obec_id: obec.id,
        nazov,
        popis,
        cena_v_bodoch,
        obrazok_url,
        stav: 'aktivna'
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  // Ak nie je podporovaná metóda
  return res.status(405).json({ error: 'Method not allowed' });
}