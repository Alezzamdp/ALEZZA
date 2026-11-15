# Tasación, mercado y financiación

## Reglas de investigación de mercado
- Objetivo: comparables reales de vehículos comercializados en Argentina y Mercosur.
- No inventar publicaciones ni precios. No presentar estimaciones de IA como precios observados.
- Al menos 3 comparables válidos (ideal 5+), misma moneda, modelo/versión/año/km similares, recientes, con fuente y URL verificable.
- Métodos robustos: mediana y análisis de dispersión. Si faltan referencias: informar insuficiencia y derivar a revisión.
- Diferenciar siempre valor estimado de mercado y valor de toma de ALEZZA.
- No aplicar descuentos o márgenes arbitrarios.
- **Margen de toma (dueño, 15/11/2026): valor de toma sugerido = mediana de comparables − 15 %** (MARGEN_TOMA en src/lib/market.ts). Es sugerencia; la toma final la aprueba una persona.

## Tasación al cliente
- Después de enviar el simulador, src/components/AsesorCompra.tsx pide /api/tasacion: Mercado Libre en vivo (marca+modelo, año ±1, ARS, mín. 3 avisos; solo devuelve el agregado).
- Si ML da 403 o hay pocos avisos: estimar_mercado (agregado de comparables ARS, mín. 3, sin exponerlos) − 15 %, y recomienda autos del stock con plan de financiación.
- Tablas: comparables (referencias, precios, fuente, URL, ubicación, fechas) y appraisals (rangos, valor de toma, confianza, aprobación). NO publicar datos internos de comparables.

## Financiación CreditCar
- Condiciones de su gráfica en src/lib/financiacion.ts. No hay integración con su API (no hay acuerdo).
- **No llamar a la API interna de CreditCar sin autorización escrita de ellos.**
- /financiacion pide DNI + WhatsApp con consentimiento (Ley 25.326). Tabla financiaciones (migración 202611150003, solo admin).
- /admin/financiacion lleva el embudo hasta "vendida" y estima la comisión.
