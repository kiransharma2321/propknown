// Normalizes any Indian phone number (with or without a leading "+91"/"91"/"0") into the
// bare 91XXXXXXXXXX form wa.me links need. Stripping to digits and keeping only the last 10
// before re-prepending "91" handles every input shape correctly, whereas blindly prepending
// "91" double-counts the country code when it's already present, and blindly omitting it
// breaks the link when the input is just a bare 10-digit local number.
export function toIndianWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `91${digits.slice(-10)}`;
}

// International-aware normalisation (lead forms accept UAE/US/UK/SG numbers too). Returns
// E.164 ("+919876543210") or null if the input can't be a real phone number. A bare 10-digit
// number, or one with a leading 0, is treated as Indian -- the site's default market.
export function toE164(phone: string, defaultCountryCode = "91"): string | null {
  const raw = phone.trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) { /* already international */ }
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  else if (digits.length === 10) digits = defaultCountryCode + digits;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

export function isIndianNumber(e164: string): boolean {
  return e164.startsWith("+91");
}

// wa.me wants the full international number, digits only.
export function toWaNumber(phone: string): string {
  return (toE164(phone) ?? phone).replace(/\D/g, "");
}
