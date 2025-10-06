import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import Stripe from 'stripe';
import { env } from '~/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        // Amount in dollars
        amount: z.number().min(1, 'Donation must be at least $1.00'),
      })
    )
    .mutation(async ({ input }) => {
      const { amount } = input;
      const baseUrl = env.AUTH_URL;

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment', // for one-time payments
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Showplayer: One-Time Donation',
                  description: 'Thank you for your support!',
                },
                // Stripe requires the amount in the smallest currency unit (cents)
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          // Redirect URLs after payment
          success_url: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/donate/cancel`,
        });

        // Return the session URL to the client
        if (!session.url) {
          throw new Error('Could not create Stripe checkout session');
        }
        return {
          url: session.url,
        };
      } catch (error) {
        console.error('STRIPE ERROR:', error);
        // Handle or throw the error as per your tRPC error handling strategy
        throw new Error('Failed to create Stripe checkout session');
      }
    }),
});
