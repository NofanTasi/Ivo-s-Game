import React from 'react';

export const Miffy: React.FC<{ size?: number; className?: string }> = ({ size = 100, className = "" }) => {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size * 1.2 }}>
      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Ears */}
        <path
          d="M32 45C32 45 25 5 38 5C51 5 44 45 44 45"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M56 45C56 45 49 5 62 5C75 5 68 45 68 45"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Head */}
        <path
          d="M15 80C15 60 30 45 50 45C70 45 85 60 85 80C85 100 70 115 50 115C30 115 15 100 15 80Z"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
        />
        
        {/* Eyes */}
        <circle cx="40" cy="78" r="2.5" fill="white" />
        <circle cx="60" cy="78" r="2.5" fill="white" />
        
        {/* Mouth (X) */}
        <path
          d="M45 90L55 100M55 90L45 100"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
