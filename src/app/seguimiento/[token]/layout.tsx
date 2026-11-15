import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seguimiento · ALEZZA", robots: { index: false, follow: false } };

export default function Layout({ children }: LayoutProps<"/seguimiento/[token]">) {
  return children;
}
