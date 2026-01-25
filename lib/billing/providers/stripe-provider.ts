import { PaymentProvider, CheckoutSession } from '../provider-factory';
import { PaymentMethod } from '../types';
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe() {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripeInstance;
}

export class StripeProvider implements PaymentProvider {
  name = PaymentMethod.STRIPE;

  async createCheckoutSession(planId: string, userId: string): Promise<CheckoutSession> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: planId, // planId should be the Stripe Price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      client_reference_id: userId,
      metadata: { userId },
    });

    return {
      id: session.id,
      url: session.url || '',
      provider: this.name,
    };
  }

  async verifyTransaction(transactionId: string): Promise<boolean> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(transactionId);
    return session.payment_status === 'paid';
  }

  async handleWebhook(payload: any, signature?: string): Promise<void> {
    // Standard Stripe webhook logic
  }
}
