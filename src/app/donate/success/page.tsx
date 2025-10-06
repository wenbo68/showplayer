// ~/app/donate/success/page.tsx

import Link from 'next/link';
import { BackButton } from '~/app/_components/BackButton';

export default function DonateSuccessPage() {
  return (
    <>
      <p className="text-xl font-bold text-gray-300">
        Thank You For Your Donation!
      </p>
      <p className="">We truly appreciate your support.</p>
    </>
  );
}
