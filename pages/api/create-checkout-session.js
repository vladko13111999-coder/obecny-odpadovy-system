import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planSize } = req.body; // Pridané: veľkosť plánu z frontendu

    const { user } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get municipality data
    const { data: obec, error: obecError } = await supabase
      .from('obce')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (obecError || !obec) {
      return res.status(404).json({ error: 'Municipality not found' });
    }

    // Determine price based on SELECTED plan size (nie podľa uloženej veľkosti)
    let priceId;
    switch (planSize) {  // Tu používame planSize z frontendu
      case 'mala':
        priceId = process.env.STRIPE_PRICE_ID_SMALL;
        break;
      case 'stredna':
        priceId = process.env.STRIPE_PRICE_ID_MEDIUM;
        break;
      case 'velka':
        priceId = process.env.STRIPE_PRICE_ID_LARGE;
        break;
      default:
        return res.status(400).json({ error: 'Invalid plan size' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?canceled=true`,
      client_reference_id: obec.id.toString(),
      customer_email: obec.email,
      metadata: {
        obec_id: obec.id.toString(),
        auth_user_id: user.id,
      },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}