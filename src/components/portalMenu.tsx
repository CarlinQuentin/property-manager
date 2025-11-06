import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  // optional width for the menu (defaults to anchor width)
  minWidth?: number;
  children: React.ReactNode;
};

export default function PortalMenu({ anchorEl, open, onClose, minWidth, children }: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; transform?: string; width?: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const menuHeight = (menuRef.current?.offsetHeight ?? 160);
    const menuWidth = Math.max(minWidth ?? rect.width, 128);

    // try to open below; if clipped, flip above
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8;

    // position aligned to right edge of anchor
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const top = openUp ? rect.top - menuHeight - 8 : rect.bottom + 8;

    setPos({ top, left, width: menuWidth });
  }, [open, anchorEl, minWidth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && anchorEl && !anchorEl.contains(target)) {
        onClose();
      }
    };
    const onResize = () => onClose();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true); // any scroll -> close (simple & robust)
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, anchorEl, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}
      className="rounded-md border bg-white shadow-lg"
    >
      {children}
    </div>,
    document.body
  );
}
