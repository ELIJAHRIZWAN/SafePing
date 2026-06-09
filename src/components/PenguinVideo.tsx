import React from 'react';

interface PenguinVideoProps {
  src: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function PenguinVideo({
  src,
  size = 140,
  className = "",
  style,
}: PenguinVideoProps) {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className={`object-contain ${className}`}
      style={{
        width: size,
        height: size,
        ...style
      }}
    >
      <source src={src} type="video/webm" />
    </video>
  );
}