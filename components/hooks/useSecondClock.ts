import { useEffect, useState } from "react";

export default function useSecondClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let intervalId: number | null = null;

    const startAlignedInterval = () => {
      setNow(Date.now());
      intervalId = window.setInterval(() => {
        setNow(Date.now());
      }, 1000);
    };

    const initialDelay = 1000 - (Date.now() % 1000);
    const timeoutId = window.setTimeout(startAlignedInterval, initialDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return now;
}
