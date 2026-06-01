"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

interface StoryRailProps {
  children: ReactNode;
  /** Color used for arrow icons. */
  accentColor?: string;
  /** Re-evaluate arrow visibility when this changes (e.g. data loaded). */
  deps?: unknown[];
}

const DRAG_THRESHOLD = 6;

export default function StoryRail({
  children,
  accentColor = "#0f172a",
  deps = [],
}: StoryRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  // Re-evaluate when children change (e.g. data loaded async)
  useEffect(() => {
    const t = setTimeout(update, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, ...deps]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    // Stop the browser from starting its native "drag-link" / "drag-image"
    // operation on mouse — that would intercept the pointermove events we
    // need to scroll. Touch is unaffected.
    if (e.pointerType === "mouse") e.preventDefault();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (!dragRef.current.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (dragRef.current.moved) {
      e.preventDefault();
      el.scrollLeft = dragRef.current.startScroll - dx;
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMoved = dragRef.current.moved;
    const el = ref.current;
    if (wasMoved && el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      // Block the click that the browser will dispatch after a drag,
      // so card links don't navigate when the user was just panning.
      const blockClick = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
        el.removeEventListener("click", blockClick, true);
      };
      el.addEventListener("click", blockClick, true);
      // Failsafe: remove the blocker shortly after in case no click fires.
      setTimeout(() => el.removeEventListener("click", blockClick, true), 50);
    }
    dragRef.current.active = false;
    dragRef.current.moved = false;
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        sx={{
          display: "flex",
          gap: 1.25,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: { xs: 16, md: 32, lg: 40 },
          mx: { xs: -2, md: -4, lg: -5 },
          px: { xs: 2, md: 4, lg: 5 },
          py: 1,
          cursor: "grab",
          userSelect: "none",
          "&:active": { cursor: "grabbing" },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          // Disable the browser's native drag-link / drag-image behavior on
          // anchors and images inside the rail — otherwise mousedown on a
          // card starts a "drag the link" operation that swallows the
          // pointermove events we need to scroll.
          "& a, & a *, & img": {
            WebkitUserDrag: "none",
            userDrag: "none",
            // Belt and suspenders: also disable via the HTML draggable
            // attribute when possible (set below on the elements themselves).
          },
        }}
      >
        {children}
      </Box>

      {canLeft && (
        <IconButton
          aria-label="Scroll left"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => scrollByDir(-1)}
          sx={{
            position: "absolute",
            left: { xs: 0, md: -6 },
            top: "50%",
            transform: "translateY(-50%)",
            width: { xs: 32, md: 38 },
            height: { xs: 32, md: 38 },
            bgcolor: "#fff",
            color: accentColor,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 10px 22px rgba(15,23,42,0.18)",
            zIndex: 3,
            transition: "all .2s ease",
            "&:hover": {
              bgcolor: "#fff",
              transform: "translateY(-50%) scale(1.06)",
              boxShadow: "0 14px 28px rgba(15,23,42,0.22)",
            },
            display: { xs: "none", sm: "inline-flex" },
          }}
          size="small"
        >
          <ChevronLeftRoundedIcon fontSize="small" />
        </IconButton>
      )}

      {canRight && (
        <IconButton
          aria-label="Scroll right"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => scrollByDir(1)}
          sx={{
            position: "absolute",
            right: { xs: 0, md: -6 },
            top: "50%",
            transform: "translateY(-50%)",
            width: { xs: 32, md: 38 },
            height: { xs: 32, md: 38 },
            bgcolor: "#fff",
            color: accentColor,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 10px 22px rgba(15,23,42,0.18)",
            zIndex: 3,
            transition: "all .2s ease",
            "&:hover": {
              bgcolor: "#fff",
              transform: "translateY(-50%) scale(1.06)",
              boxShadow: "0 14px 28px rgba(15,23,42,0.22)",
            },
            display: { xs: "none", sm: "inline-flex" },
          }}
          size="small"
        >
          <ChevronRightRoundedIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
