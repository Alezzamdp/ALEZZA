// Enlaces de contacto de ALEZZA. Sin dependencias de servidor: lo usan páginas de servidor y de cliente.
import { mensajeAlezza, waAlezza } from "@/lib/turnos";

export const SITIO = "https://alezza.com.ar";
export const UBICACION = "Mar del Plata, Argentina";
export const INSTAGRAM = "https://instagram.com/alezzamdp";
export const externo = { target: "_blank", rel: "noopener noreferrer" } as const;

export const WA_CONSULTA = waAlezza(mensajeAlezza("Quiero hacer una consulta.", [["Vehículo", "(marca, modelo y año)"]]));
export const WA_AGENCIA = waAlezza(mensajeAlezza("Soy de una agencia y quiero coordinar la preparación de unidades.", [
  ["Agencia", "(nombre)"],
  ["Unidades por mes", "(cantidad aproximada)"],
]));
