import React, { useState } from 'react';
import { motion, useAnimation } from 'motion/react';

interface MiffyProps {
  size?: number;
  className?: string;
}

export const Miffy: React.FC<MiffyProps> = ({ size = 100, className = "" }) => {
  const controls = useAnimation();
  const [isFlashing, setIsFlashing] = useState(false);

  const handleClick = async () => {
    if (isFlashing) return;
    setIsFlashing(true);
    
    // Flash 2 times: white -> black -> white -> black -> white
    // Slower duration as requested (1.2s total)
    await controls.start({
      stroke: ["#ffffff", "#000000", "#ffffff", "#000000", "#ffffff"],
      fill: ["#ffffff", "#000000", "#ffffff", "#000000", "#ffffff"],
      transition: { duration: 1.2, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" }
    });
    
    setIsFlashing(false);
  };

  return (
    <div 
      className={`relative cursor-pointer select-none inline-block ${className}`} 
      style={{ width: size, height: size * 1.2 }}
      onClick={handleClick}
    >
      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <motion.g animate={controls} stroke="white">
          {/* Ears */}
          <path
            d="M32 45C32 45 25 5 38 5C51 5 44 45 44 45"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M56 45C56 45 49 5 62 5C75 5 68 45 68 45"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Head */}
          <path
            d="M15 80C15 60 30 45 50 45C70 45 85 60 85 80C85 100 70 115 50 115C30 115 15 100 15 80Z"
            strokeWidth="2.5"
            fill="none"
          />
          
          {/* Eyes */}
          <motion.circle cx="40" cy="78" r="2.5" animate={controls} fill="white" />
          <motion.circle cx="60" cy="78" r="2.5" animate={controls} fill="white" />
          
          {/* Mouth (X) */}
          <path
            d="M45 90L55 100M55 90L45 100"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
    </div>
  );
};
