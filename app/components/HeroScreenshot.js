'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';

export default function HeroScreenshot({ src, alt, className = '' }) {
  const [open, setOpen] = useState(false);

  const item = { src, alt, title: '' };

  return (
    <>
      <div
        className={`relative aspect-[16/10] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111] cursor-zoom-in ${className}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="View fullscreen"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(true); }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
      </div>

      {open && (
        <ImageLightbox
          items={[item]}
          index={0}
          onChangeIndex={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
