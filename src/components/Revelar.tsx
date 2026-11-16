"use client";

import { type ReactNode, useEffect, useRef } from "react";

// Hace aparecer su contenido cuando entra en pantalla (clase .rv → .rv-visto, en globals.css).
export default function Revelar({ children, className = "", como: Como = "div" }: { children: ReactNode; className?: string; como?: "div" | "section" | "li" | "article" }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { el.classList.add("rv-visto"); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("rv-visto"); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Como ref={ref as never} className={`rv ${className}`}>{children}</Como>;
}
