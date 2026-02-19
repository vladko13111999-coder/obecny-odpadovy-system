import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    // Client bound to caller session (mayor)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Verify caller is a mayor (has municipality row)
    const { data: obec, error: obecError } = await supabase
      .from('obce')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (obecError) return res.status(500).json({ error: obecError.message });
    if (!obec) return res.status(403).json({ error: 'Not a mayor account' });

    const { obyvatel_id, email, redirectTo } = req.body || {};
    if (!obyvatel_id || !email) {
      return res.status(400).json({ error: 'Chýba obyvatel_id alebo email' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify resident belongs to this municipality
    const { data: obyvatel, error: obyvatelError } = await supabase
      .from('obyvatelia')
      .select('id, obec_id, auth_user_id, meno, priezvisko')
      .eq('id', obyvatel_id)
      .maybeSingle();

    if (obyvatelError) return res.status(500).json({ error: obyvatelError.message });
    if (!obyvatel || obyvatel.obec_id !== obec.id) {
      return res.status(404).json({ error: 'Obyvateľ nepatrí do vašej obce' });
    }

    if (obyvatel.auth_user_id) {
      return res.status(409).json({ error: 'Tento obyvateľ už má priradený účet' });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: 'Chýba SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey);

    // Send invite email via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: redirectTo || process.env.NEXT_PUBLIC_APP_URL || undefined,
        data: {
          obec_id: obec.id,
          obyvatel_id: obyvatel.id,
          invited_by: user.id,
        },
      }
    );

    if (inviteError) {
      return res.status(500).json({ error: inviteError.message });
    }

    // Store invite audit row
    const invitedUserId = inviteData?.user?.id || null;
    const { error: insertError } = await supabase
      .from('pozvanky_obyvatelia')
      .insert([
        {
          obec_id: obec.id,
          obyvatel_id: obyvatel.id,
          email: normalizedEmail,
          invited_user_id: invitedUserId,
        },
      ]);

    if (insertError) {
      // invite was sent; audit insert failing shouldn't block
      console.error('Invite audit insert failed:', insertError);
    }

    return res.status(200).json({
      success: true,
      invited_user_id: invitedUserId,
      message: 'Pozvánka bola odoslaná emailom',
    });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: err.message });
  }
}

