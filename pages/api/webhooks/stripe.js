import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body
const buffer = (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Update municipality subscription status
        const { error } = await supabaseAdmin
          .from('obce')
          .update({
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', parseInt(session.metadata.obec_id));

        if (error) {
          console.error('Error updating subscription:', error);
          return res.status(500).json({ error: 'Database update failed' });
        }

        console.log('Subscription activated for municipality:', session.metadata.obec_id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Update subscription status based on Stripe subscription status
        let newStatus = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
          newStatus = 'cancelled';
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          newStatus = 'expired';
        }

        const { error } = await supabaseAdmin
          .from('obce')
          .update({
            subscription_status: newStatus,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription status:', error);
        }

        console.log('Subscription updated:', subscription.id, 'Status:', newStatus);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Mark subscription as cancelled
        const { error } = await supabaseAdmin
          .from('obce')
          .update({
            subscription_status: 'cancelled',
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error cancelling subscription:', error);
        }

        console.log('Subscription cancelled:', subscription.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
