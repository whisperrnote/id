import { NextResponse } from 'next/server';
import { billingManager } from '@/lib/billing/provider-factory';
import { StripeProvider } from '@/lib/billing/providers/stripe-provider';
import { CryptoPaymentProvider } from '@/lib/billing/providers/crypto-provider';
import { PaymentMethod } from '@/lib/billing/types';

// Register providers
billingManager.registerProvider(new StripeProvider());
billingManager.registerProvider(new CryptoPaymentProvider());

export async function POST(req: Request) {
  try {
    const { planId, userId, method } = await req.json();

    if (!planId || !userId || !method) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const provider = billingManager.getProvider(method as PaymentMethod);
    const session = await provider.createCheckoutSession(planId, userId);

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
