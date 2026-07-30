import React, { useRef, useCallback, useEffect, useState } from 'react';

interface BottomSheetProps {
  children: React.ReactNode;
  /** Altura mínima en px (collapsed) */
  minHeight?: number;
  /** Altura máxima en px (fully open). Si no se especifica, usa 85vh */
  maxHeight?: number;
  /** Altura inicial al montar */
  defaultHeight?: number;
  /** Alturas de snap (en px). Al soltar, el sheet se mueve al snap más cercano */
  snapPoints?: number[];
}

const HANDLE_HEIGHT = 28; // px del area de drag handle

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  minHeight = 56,
  maxHeight,
  defaultHeight,
  snapPoints,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);


  const [height, setHeight] = useState<number>(() => {
    return defaultHeight ?? Math.round(window.innerHeight * 0.45);
  });

  const getMaxH = useCallback(() => {
    return maxHeight ?? Math.round(window.innerHeight * 0.88);
  }, [maxHeight]);

  const snapToNearest = useCallback((currentH: number) => {
    if (!snapPoints || snapPoints.length === 0) {
      // Sin snap points: clamp y listo
      const clamped = Math.max(minHeight, Math.min(currentH, getMaxH()));
      setHeight(clamped);
      return;
    }

    // Encontrar el snap point más cercano
    let nearest = snapPoints[0];
    let minDist = Math.abs(currentH - snapPoints[0]);
    for (const sp of snapPoints) {
      const dist = Math.abs(currentH - sp);
      if (dist < minDist) { minDist = dist; nearest = sp; }
    }
    setHeight(nearest);
  }, [snapPoints, minHeight, getMaxH]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = sheetRef.current?.offsetHeight ?? height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = startY.current - e.clientY; // positivo = subir
    const newH = Math.max(minHeight, Math.min(startHeight.current + delta, getMaxH()));
    if (sheetRef.current) {
      sheetRef.current.style.height = `${newH}px`;
    }
  }, [minHeight, getMaxH]);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const currentH = sheetRef.current?.offsetHeight ?? height;
    snapToNearest(currentH);
  }, [height, snapToNearest]);

  // Sincronizar height state → DOM (con transición suave al hacer snap)
  useEffect(() => {
    if (!sheetRef.current || isDragging.current) return;
    sheetRef.current.style.transition = 'height 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    sheetRef.current.style.height = `${height}px`;
    const t = setTimeout(() => {
      if (sheetRef.current) sheetRef.current.style.transition = '';
    }, 260);
    return () => clearTimeout(t);
  }, [height]);

  // Ajustar max en resize
  useEffect(() => {
    const onResize = () => {
      setHeight(h => Math.min(h, getMaxH()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getMaxH]);

  const isCollapsed = height <= minHeight + 4;

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col bg-[var(--bg-surface)] border-t border-[var(--border-color)] rounded-t-2xl shadow-[0_-4px_40px_rgba(0,0,0,0.14)] overflow-hidden select-none"
      style={{ height: `${height}px` }}
    >
      {/* ── Drag Handle ── */}
      <div
        className="flex flex-col items-center justify-center shrink-0 cursor-ns-resize touch-none"
        style={{ height: `${HANDLE_HEIGHT}px`, paddingTop: 8, paddingBottom: 4 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border-color)]" />
      </div>

      {/* ── Content (scrollable) ── */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.15s ease' }}
      >
        {children}
      </div>
    </div>
  );
};
