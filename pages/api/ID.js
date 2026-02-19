import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.query;

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

  // GET jednej odmeny (ak treba)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('odmeny')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Odmena neexistuje' });
    }

    return res.status(200).json(data);
  }

  // PUT - úprava odmeny
  if (req.method === 'PUT') {
    const { nazov, popis, cena_v_bodoch, obrazok_url, stav } = req.body;

    const updates = {};
    if (nazov !== undefined) updates.nazov = nazov;
    if (popis !== undefined) updates.popis = popis;
    if (cena_v_bodoch !== undefined) updates.cena_v_bodoch = cena_v_bodoch;
    if (obrazok_url !== undefined) updates.obrazok_url = obrazok_url;
    if (stav !== undefined) updates.stav = stav;
    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from('odmeny')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  // DELETE - zmazanie odmeny
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('odmeny')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}