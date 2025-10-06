// ~/app/donate/cancel/page.tsx

import Link from 'next/link';

export default function DonateCancelPage() {
  return (
    <>
      <p className="text-xl font-bold text-gray-300">Payment Canceled</p>
      <p className="">
        Your payment session was canceled. You have not been charged.
      </p>
    </>
  );
}
