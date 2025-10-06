// ~/app/_components/DonationForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';

export default function DonationForm() {
  const [amount, setAmount] = useState<number>(1);
  const router = useRouter();

  const { mutate: createCheckout, isPending } =
    api.stripe.createCheckoutSession.useMutation({
      onSuccess: (data) => {
        // Redirect the user to the Stripe Checkout page
        if (data.url) {
          router.push(data.url);
        }
      },
      onError: (error) => {
        // You can show a toast notification or an error message here
        console.error('Failed to create checkout session:', error);
        alert('Could not proceed to payment. Please try again.');
      },
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (amount >= 1) {
      createCheckout({ amount });
    } else {
      alert('Minimum donation amount is $1.00');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto p-6 bg-gray-800 rounded flex flex-col gap-4 text-sm font-semibold"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-gray-300">
          Donation Amount (USD)
        </label>
        <div className="rounded">
          <input
            type="number"
            name="amount"
            id="amount"
            className="block w-full py-1 px-2 rounded bg-gray-700 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            placeholder="10.00"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center py-2 px-4 rounded text-gray-300 bg-blue-600 hover:bg-blue-500 disabled:cursor-not-allowed"
      >
        {isPending ? 'Processing...' : `Donate via Stripe`}
      </button>
    </form>
  );
}
