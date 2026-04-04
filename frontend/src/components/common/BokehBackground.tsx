/* src/components/common/BokehBackground.tsx */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './BokehBackground.css';

interface Particle {
  id: number;
  size: number;
  x: string;
  y: string;
  duration: number;
  delay: number;
  opacity: number;
}

const BokehBackground: React.FC = () => {
  const particles = useMemo(() => {
    const p: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      p.push({
        id: i,
        size: Math.random() * 200 + 50,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        duration: Math.random() * 20 + 20,
        delay: Math.random() * -20,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }
    return p;
  }, []);

  return (
    <div className="bokeh-container">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="bokeh-particle"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            opacity: p.opacity,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default BokehBackground;
