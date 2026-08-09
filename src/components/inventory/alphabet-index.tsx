"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

/**
 * A vertical A-Z rail (tap or drag) that jumps a scrollable list to the
 * matching letter section -- lets people find one item in a long catalog
 * without scrolling through everything, same idea as the iOS Contacts /
 * Square Library index.
 */
export function AlphabetIndex({
  availableLetters,
  onSelect,
}: {
  availableLetters: Set<string>;
  onSelect: (letter: string) => void;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [activeLetter, setActiveLetter] = React.useState<string | null>(null);

  const letterAt = React.useCallback((clientY: number) => {
    const rail = railRef.current;
    if (!rail) return null;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 0.999);
    return LETTERS[Math.floor(ratio * LETTERS.length)] ?? null;
  }, []);

  function handleAt(clientY: number) {
    const letter = letterAt(clientY);
    if (!letter || !availableLetters.has(letter)) return;
    if (letter !== activeLetter) {
      setActiveLetter(letter);
      onSelect(letter);
      if (navigator.vibrate) navigator.vibrate(3);
    }
  }

  return (
    <div
      ref={railRef}
      className="fixed inset-y-0 right-0 z-20 flex w-6 touch-none flex-col items-center justify-center gap-px py-20"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        handleAt(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1 && e.pointerType !== "touch") return;
        handleAt(e.clientY);
      }}
      onPointerUp={() => setActiveLetter(null)}
      onPointerLeave={() => setActiveLetter(null)}
    >
      {LETTERS.map((letter) => {
        const available = availableLetters.has(letter);
        return (
          <span
            key={letter}
            className={cn(
              "text-[9px] font-bold leading-none",
              available ? "text-primary" : "text-muted-foreground/30",
              activeLetter === letter && "scale-150 text-primary"
            )}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}
