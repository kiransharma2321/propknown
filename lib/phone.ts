// Normalizes any Indian phone number (with or without a leading "+91"/"91"/"0") into the
// bare 91XXXXXXXXXX form wa.me links need. Stripping to digits and keeping only the last 10
// before re-prepending "91" handles every input shape correctly, whereas blindly prepending
// "91" double-counts the country code when it's already present, and blindly omitting it
// breaks the link when the input is just a bare 10-digit local number.
export function toIndianWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `91${digits.slice(-10)}`;
}
