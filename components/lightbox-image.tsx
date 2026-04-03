"use client";

import { useState } from "react";

type LightboxImageProps = {
  src: string;
  alt: string;
  thumbClassName?: string;
  fullClassName?: string;
};

export function LightboxImage({
  src,
  alt,
  thumbClassName = "",
  fullClassName = ""
}: LightboxImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block">
        <img src={src} alt={alt} className={thumbClassName} />
      </button>
      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6"
        >
          <img src={src} alt={alt} className={fullClassName || "max-h-[90vh] max-w-[90vw] rounded-2xl"} />
        </button>
      ) : null}
    </>
  );
}
