'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function useFinePointer() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const media = window.matchMedia('(pointer: fine)');
      media.addEventListener('change', onStoreChange);
      return () => media.removeEventListener('change', onStoreChange);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : false),
    () => false
  );
}

export function CursorGlow() {
  const isFinePointer = useFinePointer();
  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const mousePos = useRef({ x: -400, y: -400 });
  const currentPos = useRef({ x: -400, y: -400 });
  const auraRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!isFinePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'a, button, input, textarea, select, [role="button"], [data-cursor-hover], [data-interactive="true"], media-player, kbd'
      );
      setIsHovered(!!interactive);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;

      // Smooth damped interpolation for natural weightless glide
      const lerp = 0.12;
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * lerp;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * lerp;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isFinePointer]);

  if (!isFinePointer) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-500 ease-out select-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* Soft, minimal translucent gradient aura */}
      <div
        ref={auraRef}
        className={`absolute top-0 left-0 rounded-full will-change-transform transition-transform duration-300 ease-out pointer-events-none ${
          isHovered
            ? 'w-[560px] h-[560px] opacity-100 scale-110'
            : 'w-[480px] h-[480px] opacity-80 scale-100'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(45, 212, 191, 0.15) 0%, rgba(56, 189, 248, 0.11) 30%, rgba(59, 130, 246, 0.04) 55%, transparent 75%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
}
