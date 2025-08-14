import React, { useState, useRef, useEffect } from 'react';

interface LazyVideoProps {
  src: string;
  fallbackSrc?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  children?: React.ReactNode;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (e: any) => void;
}

export const LazyVideo: React.FC<LazyVideoProps> = ({
  src,
  fallbackSrc,
  className = '',
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = false,
  children,
  onLoadStart,
  onCanPlay,
  onError,
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoadStart = () => {
    setIsLoaded(true);
    onLoadStart?.();
  };

  if (!isIntersecting) {
    return (
      <div
        ref={videoRef}
        className={`${className} flex items-center justify-center bg-gray-100 animate-pulse`}
      >
        {children}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload="metadata"
      onLoadStart={handleLoadStart}
      onCanPlay={onCanPlay}
      onError={onError}
    >
      <source src={src} type="video/mp4" />
      {fallbackSrc && <source src={fallbackSrc} type="video/quicktime" />}
      {children}
    </video>
  );
};