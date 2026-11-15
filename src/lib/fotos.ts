// Achica las fotos del celular antes de subirlas (3-8 MB → ~300 KB): suben rápido con datos móviles.
export async function achicarFoto(file: File, lado = 1600, calidad = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("No es una imagen.");
  const bmp = await createImageBitmap(file);
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto."))), "image/jpeg", calidad));
}
