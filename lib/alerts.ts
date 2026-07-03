import { prisma } from "@/lib/db";
import { sendAdminEmail } from "@/lib/email";

// Parses free-text price strings like "₹85 Lakhs", "₹2.8 Cr", "₹25L/acre" into an approximate INR number.
function parsePriceToINR(display: string): number | null {
  const m = display.replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lakh|lakhs)?/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("cr")) return num * 1e7;
  if (unit.startsWith("l")) return num * 1e5;
  return num;
}

interface NewListing {
  id: string;
  title: string;
  propType: string;
  city: string;
  area: string;
  priceDisplay: string;
}

// Finds active alerts matching a newly-listed/approved property and emails the buyer.
export async function notifyMatchingAlerts(listing: NewListing): Promise<void> {
  try {
    const alerts = await prisma.alert.findMany({
      where: { active: true },
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });
    if (alerts.length === 0) return;

    const price = parsePriceToINR(listing.priceDisplay);

    const matches = alerts.filter(a => {
      if (a.city && !listing.city.toLowerCase().includes(a.city.toLowerCase())) return false;
      if (a.propType && a.propType.toLowerCase() !== listing.propType.toLowerCase()) return false;
      if (price != null) {
        if (a.minBudget != null && price < a.minBudget) return false;
        if (a.maxBudget != null && price > a.maxBudget) return false;
      }
      return true;
    });

    await Promise.all(matches.map(a =>
      sendAdminEmail({
        to: a.buyer.email,
        subject: `New match for your saved alert: ${listing.title}`,
        html: buildAlertHtml(a.buyer.name, listing),
      }).catch(() => null)
    ));
  } catch (err) {
    console.error("[alerts] notifyMatchingAlerts failed:", err);
  }
}

function buildAlertHtml(buyerName: string, listing: NewListing): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
      <div style="background:#0a0a0a;padding:20px 24px">
        <span style="color:#C9A24B;font-size:20px;font-weight:800">PROP</span>
        <span style="color:#fff;font-size:20px;font-weight:800">KNOWN</span>
        <p style="color:#999;font-size:11px;margin:4px 0 0">New Property Alert Match</p>
      </div>
      <div style="padding:24px">
        <p style="color:#333;font-size:14px">Hi ${buyerName},</p>
        <p style="color:#333;font-size:14px">A new property just went live matching one of your saved alerts:</p>
        <h2 style="margin:12px 0;color:#0a0a0a;font-size:16px">${listing.title}</h2>
        <p style="color:#555;font-size:13px">${listing.area}, ${listing.city} &middot; <strong style="color:#C9A24B">${listing.priceDisplay}</strong></p>
        <div style="margin-top:20px">
          <a href="https://www.propknown.com/buy" style="display:inline-block;background:#C9A24B;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">View on PropKnown →</a>
        </div>
        <p style="color:#aaa;font-size:10px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px">PropKnown Infra Pvt Ltd · kiranpropservices@gmail.com · +91 97017 71333</p>
      </div>
    </div>`;
}
