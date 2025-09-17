'use client';

import { useEffect, useState } from 'react';

export default function UtcTime() {
  // --- START: UTC TIMER LOGIC ---

  // 1. Add state to hold the current UTC time as a Date object.
  const [utcTime, setUtcTime] = useState(new Date());

  // 2. Set up an effect to update the time every minute.
  useEffect(() => {
    // Set an interval to create a new Date object every 60 seconds.
    const timerId = setInterval(() => {
      setUtcTime(new Date());
    }, 60000); // 60000 milliseconds = 1 minute

    // Cleanup function: This runs when the component unmounts to prevent memory leaks.
    return () => {
      clearInterval(timerId);
    };
  }, []); // The empty array [] ensures this effect runs only once when the component mounts.

  // 3. Format the Date object into the desired string format.
  const year = utcTime.getUTCFullYear();
  // getUTCMonth() is 0-indexed (0=Jan), so we add 1.
  const month = String(utcTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcTime.getUTCDate()).padStart(2, '0');
  const hours = String(utcTime.getUTCHours()).padStart(2, '0');
  const minutes = String(utcTime.getUTCMinutes()).padStart(2, '0');

  const formattedUtcTime = `${year}/${month}/${day} ${hours}:${minutes}`;

  // --- END: UTC TIMER LOGIC ---
  return <p className="">- CURRENT UTC TIME: {formattedUtcTime}</p>;
}
