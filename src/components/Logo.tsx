import Image from "next/image";

// El logo original de ALEZZA (PNG negro sin fondo). En modo oscuro globals.css lo invierte.
export default function Logo({ alto = 28, className = "" }: { alto?: number; className?: string }) {
  return (
    <Image
      src="/logo-alezza.png"
      alt="ALEZZA"
      width={358}
      height={69}
      priority
      style={{ height: alto, width: "auto" }}
      className={`logo-alezza shrink-0 object-contain object-left ${className}`}
    />
  );
}
