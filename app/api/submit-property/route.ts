import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { notifyNewSubmission } from "@/lib/notifications";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, propType, bhk, size, sizeUnit,
      priceDisplay, city, area, description, features, reraNumber,
      ownerName, ownerPhone, ownerEmail,
      photoIds = [], videoIds = [], videoUrls = [], docIds = [],
    } = body;

    if (!title || !propType || !priceDisplay || !city || !area || !description || !ownerName || !ownerPhone || !ownerEmail) {
      return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
    }

    const phoneClean = String(ownerPhone).replace(/\D/g, "");
    if (phoneClean.length < 10) {
      return NextResponse.json({ error: "Please enter a valid phone number (min 10 digits)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "Please upload at least 1 photo." }, { status: 400 });
    }

    const submission = await prisma.propertySubmission.create({
      data: {
        title:        title.trim(),
        propType,
        bhk:          bhk || null,
        size:         size || null,
        sizeUnit:     sizeUnit || null,
        priceDisplay: priceDisplay.trim(),
        city:         city.trim(),
        area:         area.trim(),
        description:  description.trim(),
        features:     features || null,
        reraNumber:   reraNumber || null,
        ownerName:    ownerName.trim(),
        ownerPhone:   ownerPhone.trim(),
        ownerEmail:   ownerEmail.trim().toLowerCase(),
        photoIds:     JSON.stringify(photoIds),
        videoIds:     JSON.stringify(videoIds),
        videoUrls:    JSON.stringify(videoUrls),
        docIds:       JSON.stringify(docIds),
        status:       "pending",
      },
    });

    // Bell notification (fire-and-forget)
    notifyNewSubmission({ id: submission.id, title, ownerName, city }).catch(() => null);

    // Email admin (fire-and-forget)
    resend.emails.send({
      from: "PropKnown <onboarding@resend.dev>",
      to: "kiranpropservices@gmail.com",
      subject: `New Property Submission: ${title}`,
      html: `
        <h2 style="color:#C9A24B">New Property Submission — Review Required</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 12px;font-weight:bold">Title</td><td style="padding:6px 12px">${title}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Type</td><td style="padding:6px 12px">${propType}${bhk ? ` — ${bhk}` : ""}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Location</td><td style="padding:6px 12px">${area}, ${city}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Price</td><td style="padding:6px 12px">${priceDisplay}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Owner</td><td style="padding:6px 12px">${ownerName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Phone</td><td style="padding:6px 12px">${ownerPhone}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${ownerEmail}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Photos</td><td style="padding:6px 12px">${photoIds.length} uploaded</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Documents</td><td style="padding:6px 12px">${docIds.length} uploaded</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">RERA</td><td style="padding:6px 12px">${reraNumber || "Not provided"}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="https://www.propknown.com/admin/dashboard" style="background:#C9A24B;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
            Review in Admin Dashboard →
          </a>
        </p>
      `,
    }).catch(() => null);

    return NextResponse.json({ id: submission.id, message: "Submission received successfully." });
  } catch (err) {
    console.error("Submit-property error:", err);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
