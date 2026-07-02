import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminEmail, buildSubmissionHtml } from "@/lib/email";
import { notifyNewSubmission } from "@/lib/notifications";

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

    // Bell notification
    notifyNewSubmission({ id: submission.id, title, ownerName, city }).catch(() => null);

    // Email admin — to both kiranpropservices@gmail.com and raghupinnelli@gmail.com, logs message ID
    sendAdminEmail({
      subject: `New Property Submission: ${title}`,
      html: buildSubmissionHtml({
        title, propType, bhk, priceDisplay, city, area,
        ownerName, ownerPhone, ownerEmail, reraNumber,
        photoCount: photoIds.length, docCount: docIds.length,
      }),
    }).catch(() => null);

    return NextResponse.json({ id: submission.id, message: "Submission received successfully." });
  } catch (err) {
    console.error("Submit-property error:", err);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
