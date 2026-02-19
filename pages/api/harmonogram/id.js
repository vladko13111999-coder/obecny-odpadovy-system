import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.query;

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

  // GET jednej udalosti
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('harmonogram')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Udalosť neexistuje' });
    }

    return res.status(200).json(data);
  }

  // PUT - úprava udalosti
  if (req.method === 'PUT') {
    const { datum, typ_odpadu, poznamka } = req.body;

    const updates = {};
    if (datum !== undefined) updates.datum = datum;
    if (typ_odpadu !== undefined) updates.typ_odpadu = typ_odpadu;
    if (poznamka !== undefined) updates.poznamka = poznamka;
    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from('harmonogram')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  // DELETE - zmazanie udalosti
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('harmonogram')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}