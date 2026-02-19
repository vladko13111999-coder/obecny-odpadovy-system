import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Povoliť len PUT
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Získanie tokenu
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Vytvorenie Supabase klienta
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

  // Overenie používateľa
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error:', authError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  if (body.nazov !== undefined && String(body.nazov).trim().length === 0) {
    return res.status(400).json({ error: 'Názov obce je povinný' });
  }

  try {
    // Najprv zistíme, či obec pre tohto používateľa už existuje
    const { data: existing, error: selectError } = await supabase
      .from('obce')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (selectError) {
      console.error('Supabase select error:', selectError);
      return res.status(500).json({ error: selectError.message });
    }

    // Spoločné dáta z body
    const { nazov, ico, ulica, mesto, psc, velkost_obce } = body;

    const baseFields = {};
    if (nazov !== undefined) baseFields.nazov = nazov;
    if (ico !== undefined) baseFields.ico = ico;
    if (ulica !== undefined) baseFields.ulica = ulica;
    if (mesto !== undefined) baseFields.mesto = mesto;
    if (psc !== undefined) baseFields.psc = psc;
    // `velkost_obce` je v DB NOT NULL, tak vždy doplníme hodnotu
    baseFields.velkost_obce =
      velkost_obce ?? existing?.velkost_obce ?? 'mala';

    if (existing) {
      // Existujúci záznam -> UPDATE
      const { error } = await supabase
        .from('obce')
        .update(baseFields)
        .eq('auth_user_id', user.id);

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      // Neexistuje -> INSERT
      const insertData = {
        auth_user_id: user.id,
        ...baseFields,
        email: user.email || null,
        subscription_status: 'trial',
      };

      const { error } = await supabase
        .from('obce')
        .insert([insertData]);

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Finálny SELECT, aby sme mali istotu, že sa zmena prejavila
    const { data: result, error: finalSelectError } = await supabase
      .from('obce')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (finalSelectError) {
      console.error('Supabase final select error:', finalSelectError);
      return res.status(500).json({ error: finalSelectError.message });
    }

    if (!result) {
      return res.status(500).json({
        error: 'Nepodarilo sa uložiť údaje obce',
        hint:
          'Skontroluj RLS policy pre obce (SELECT/UPDATE/INSERT) a či stĺpce ico/ulica/mesto/psc existujú v DB.',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Unexpected error while updating municipality:', err);
    return res.status(500).json({ error: 'Server error while updating municipality' });
  }
}