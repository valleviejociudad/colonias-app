import React, { useEffect, useRef, useState } from 'react';

/**
 * Andarivel de pileta: una cuerda con boyas rojas y amarillas.
 * Las boyas "encendidas" marcan el avance; las nuevas se encienden de a una.
 */
export default function LaneRope({ total = 10, filled = 0, label }) {
  const prev = useRef(filled);
  const [popFrom, setPopFrom] = useState(filled);

  useEffect(() => {
    if (filled > prev.current) setPopFrom(prev.current);
    else setPopFrom(filled);
    prev.current = filled;
  }, [filled]);

  return (
    <div
      className="lane-rope"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-label={label || 'Avance del formulario'}
    >
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled;
        const pops = on && i >= popFrom;
        return (
          <span
            key={`${i}-${pops ? filled : 'x'}`}
            className={`buoy ${on ? 'on' : ''} ${pops ? 'pop' : ''}`}
            style={pops ? { animationDelay: `${(i - popFrom) * 70}ms` } : undefined}
          />
        );
      })}
    </div>
  );
}
