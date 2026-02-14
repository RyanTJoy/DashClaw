'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

export default function ClickToFullscreenImage({
  src,
  alt,
  title,
  description,
  aspectClassName = 'aspect-[16/10]',
  sizes = '(max-width: 768px) 100vw, 900px',
  priority = false,
  className = '',
  imageClassName = 'object-cover',
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const openIt = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <div
        className={`group relative ${aspectClassName} overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111] cursor-zoom-in ${className}`}
        onClick={openIt}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openIt()}
        aria-label="Open fullscreen image"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`${imageClassName} transform group-hover:scale-[1.01] transition-transform duration-500`}
        />

        {(title || description) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent p-4">
            {title && <div className="text-sm font-semibold text-white">{title}</div>}
            {description && <div className="mt-0.5 text-xs text-zinc-300">{description}</div>}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl cursor-zoom-out"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            <div
              className="relative w-[min(92vw,1400px)] h-[min(92vh,860px)]"
              onClick={close}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
              aria-label="Close fullscreen image"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="100vw"
                priority
                className="object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

