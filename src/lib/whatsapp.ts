import { parsePhoneNumber } from "libphonenumber-js";

export function getWhatsAppUrl(value: string, message?: string): string | null {
  try {
    const phoneNumber = parsePhoneNumber(value, "AR");

    if (!phoneNumber || !phoneNumber.isPossible()) return null;

    const baseUrl = `https://wa.me/${phoneNumber.number.slice(1)}`;
    return message
      ? `${baseUrl}?text=${encodeURIComponent(message)}`
      : baseUrl;
  } catch {
    return null;
  }
}
