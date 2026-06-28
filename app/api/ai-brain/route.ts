import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ROUNDS = 8;

// ─── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are AI Brain, the intelligent admin assistant for PropKnown Infra Pvt Ltd.
You help Raghu (the founder) manage property listings, leads, and generate professional content.

COMPANY: PropKnown Infra Pvt Ltd | India | Hyderabad | kiranpropservices@gmail.com | +91 97017 71333

PRICE PARSING RULES:
- "3.5Cr" or "3.5 crore" → 35000000 (INR)
- "85L" or "85 lakhs" → 8500000 (INR)
- "30L" → 3000000 (INR)
- "1.2Cr" → 12000000 (INR)
- Always store as full integer in INR

PROPERTY TYPES (use exactly): apartment, villa, plot, commercial, farmland, independent_house
LISTING TYPES: sale, rent
LEAD STATUSES: new, contacted, visit_booked, negotiation, won, lost

BEHAVIOR RULES:
- Always use tools to interact with the database — never fabricate data
- For DELETE: first call search_listings to find the item, show what will be deleted, then ask user to confirm
- Only delete after user explicitly confirms (says "yes", "confirm", "delete it", etc.)
- When adding a listing, parse price notation carefully (lakhs/crores/millions)
- For content generation, be professional, warm, and India/real-estate focused
- NEVER run shell commands, edit files, or modify code — only database operations
- Keep responses concise and action-oriented
- When you successfully add/edit/delete something, confirm what changed`;

// ─── Tool Definitions ──────────────────────────────────────────────────────────
const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_listings",
    description: "Search property listings in the database. Always call this before editing or deleting.",
    input_schema: {
      type: "object" as const,
      properties: {
        query:        { type: "string", description: "Free text search across title and location" },
        city:         { type: "string", description: "Filter by city e.g. Hyderabad, Bangalore, Dubai" },
        location:     { type: "string", description: "Filter by area/locality e.g. Kokapet, Gachibowli" },
        propertyType: { type: "string", description: "apartment, villa, plot, commercial, farmland" },
        status:       { type: "string", description: "pending, approved, rejected. Omit for all." },
        limit:        { type: "number", description: "Max results to return. Default 10." },
      },
    },
  },
  {
    name: "add_listing",
    description: "Add a new property listing to the database. Will be immediately visible on the Buy page.",
    input_schema: {
      type: "object" as const,
      properties: {
        title:        { type: "string",  description: "Full property title e.g. 'My Home Bhooja 3BHK'" },
        location:     { type: "string",  description: "Area/locality e.g. Kokapet" },
        city:         { type: "string",  description: "City e.g. Hyderabad" },
        state:        { type: "string",  description: "State e.g. Telangana. Default: Telangana" },
        country:      { type: "string",  description: "Country. Default: India" },
        price:        { type: "number",  description: "Price as full integer in currency smallest unit (INR rupees, AED dirhams)" },
        currency:     { type: "string",  description: "INR, AED, USD, GBP, SGD, CAD, AUD. Default: INR" },
        beds:         { type: "number",  description: "Number of bedrooms" },
        baths:        { type: "number",  description: "Number of bathrooms" },
        sqft:         { type: "number",  description: "Area in sq.ft" },
        propertyType: { type: "string",  description: "apartment, villa, plot, commercial, farmland, independent_house" },
        listingType:  { type: "string",  description: "sale or rent" },
        reraNumber:   { type: "string",  description: "RERA/HMDA registration number" },
        aiScore:      { type: "number",  description: "AI investment score 0-10" },
        description:  { type: "string",  description: "Property description text" },
        featured:     { type: "boolean", description: "Feature this listing on homepage" },
        reraVerified: { type: "boolean", description: "RERA verified flag" },
      },
      required: ["title", "location", "city", "price", "propertyType", "listingType"],
    },
  },
  {
    name: "update_listing",
    description: "Update one or more fields on an existing property listing. Get the ID from search_listings first.",
    input_schema: {
      type: "object" as const,
      properties: {
        id:      { type: "string", description: "Property ID from search_listings result" },
        updates: {
          type: "object",
          description: "Object with fields to update: title, price, location, city, status, featured, aiScore, description, reraNumber, beds, baths, sqft, reraVerified, realPhotos, accuratePrice, ownerConsent",
        },
      },
      required: ["id", "updates"],
    },
  },
  {
    name: "delete_listing",
    description: "Delete a property listing permanently. Always show what will be deleted and ask user to confirm before calling with confirmed=true.",
    input_schema: {
      type: "object" as const,
      properties: {
        id:        { type: "string",  description: "Property ID to delete. Get from search_listings first." },
        confirmed: { type: "boolean", description: "MUST be true to delete. Use false to preview only." },
      },
      required: ["id", "confirmed"],
    },
  },
  {
    name: "get_leads",
    description: "Fetch leads/enquiries from the database with optional filters.",
    input_schema: {
      type: "object" as const,
      properties: {
        status:     { type: "string", description: "Filter: new, contacted, visit_booked, negotiation, won, lost" },
        source:     { type: "string", description: "Filter by lead source" },
        dateFilter: { type: "string", description: "today, this_week, this_month" },
        search:     { type: "string", description: "Search by name or phone" },
        limit:      { type: "number", description: "Max results. Default 20." },
      },
    },
  },
  {
    name: "update_lead",
    description: "Update a lead's pipeline status or add notes. Get the ID from get_leads first.",
    input_schema: {
      type: "object" as const,
      properties: {
        id:     { type: "string", description: "Lead ID from get_leads result" },
        status: { type: "string", description: "new, contacted, visit_booked, negotiation, won, lost" },
        notes:  { type: "string", description: "Notes to add or replace" },
      },
      required: ["id"],
    },
  },
];

// ─── Tool Execution ────────────────────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "search_listings": {
        const where: Record<string, unknown> = {};
        if (input.city)         where.city         = { contains: input.city as string,     mode: "insensitive" };
        if (input.location)     where.location     = { contains: input.location as string, mode: "insensitive" };
        if (input.propertyType) where.propertyType = input.propertyType;
        if (input.status)       where.status       = input.status;

        let results = await prisma.property.findMany({
          where,
          take: (input.limit as number) || 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, title: true, location: true, city: true,
            price: true, currency: true, status: true,
            propertyType: true, listingType: true,
            reraNumber: true, aiScore: true, beds: true, sqft: true,
            featured: true, createdAt: true,
          },
        });

        if (input.query) {
          const q = (input.query as string).toLowerCase();
          results = results.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q)
          );
        }

        return JSON.stringify({ count: results.length, listings: results });
      }

      case "add_listing": {
        const property = await prisma.property.create({
          data: {
            title:        input.title        as string,
            location:     input.location     as string,
            city:         input.city         as string,
            state:        (input.state        as string)  || "Telangana",
            country:      (input.country      as string)  || "India",
            price:        input.price        as number,
            currency:     (input.currency     as string)  || "INR",
            beds:         (input.beds         as number)  ?? null,
            baths:        (input.baths        as number)  ?? null,
            sqft:         (input.sqft         as number)  ?? null,
            propertyType: input.propertyType as string,
            listingType:  input.listingType  as string,
            reraNumber:   (input.reraNumber   as string)  ?? null,
            aiScore:      (input.aiScore      as number)  ?? null,
            description:  (input.description  as string)  ?? null,
            featured:     (input.featured     as boolean) || false,
            reraVerified: (input.reraVerified as boolean) || false,
            images:       [],
            amenities:    [],
            documents:    [],
            status:       "approved",
          },
        });
        return JSON.stringify({
          success: true,
          id: property.id,
          title: property.title,
          city: property.city,
          price: property.price,
          message: `✅ Added listing: "${property.title}" in ${property.city}. Now visible on Buy page.`,
        });
      }

      case "update_listing": {
        const updates = input.updates as Record<string, unknown>;
        const property = await prisma.property.update({
          where: { id: input.id as string },
          data: updates,
          select: { id: true, title: true, city: true, price: true, status: true },
        });
        return JSON.stringify({
          success: true,
          id: property.id,
          title: property.title,
          message: `✅ Updated "${property.title}" — ${Object.keys(updates).join(", ")} changed.`,
        });
      }

      case "delete_listing": {
        if (!input.confirmed) {
          const p = await prisma.property.findUnique({
            where: { id: input.id as string },
            select: { id: true, title: true, location: true, city: true, price: true, currency: true, status: true },
          });
          if (!p) return JSON.stringify({ error: "Listing not found with that ID." });
          return JSON.stringify({
            needsConfirmation: true,
            listing: p,
            message: `⚠️ About to delete: "${p.title}" at ${p.location}, ${p.city} (${p.currency} ${p.price.toLocaleString()}). This cannot be undone. Call again with confirmed=true to proceed.`,
          });
        }
        const p = await prisma.property.delete({ where: { id: input.id as string } });
        return JSON.stringify({
          success: true,
          title: p.title,
          message: `🗑️ Deleted "${p.title}" permanently.`,
        });
      }

      case "get_leads": {
        const where: Record<string, unknown> = {};
        if (input.status) where.status = input.status;
        if (input.source) where.source = { contains: input.source as string, mode: "insensitive" };
        if (input.dateFilter) {
          const now = new Date();
          const start = new Date(now);
          if      (input.dateFilter === "today")      { start.setHours(0, 0, 0, 0); }
          else if (input.dateFilter === "this_week")  { start.setDate(now.getDate() - 7); }
          else if (input.dateFilter === "this_month") { start.setDate(1); start.setHours(0, 0, 0, 0); }
          where.createdAt = { gte: start };
        }
        if (input.search) {
          const q = input.search as string;
          where.OR = [
            { name:  { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ];
        }

        const leads = await prisma.lead.findMany({
          where,
          take: (input.limit as number) || 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, phone: true, email: true,
            source: true, status: true, message: true,
            notes: true, createdAt: true,
          },
        });

        return JSON.stringify({ count: leads.length, leads });
      }

      case "update_lead": {
        const updates: Record<string, unknown> = {};
        if (input.status) updates.status = input.status;
        if (input.notes)  updates.notes  = input.notes;
        const lead = await prisma.lead.update({
          where: { id: input.id as string },
          data: updates,
          select: { id: true, name: true, status: true },
        });
        return JSON.stringify({
          success: true,
          id: lead.id,
          name: lead.name,
          status: lead.status,
          message: `✅ Updated lead "${lead.name}" — status: ${lead.status}.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Tool ${name} failed: ${msg}` });
  }
}

// ─── POST Handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth gate — admin only
  const cookieStore = cookies();
  const adminAuth = cookieStore.get("admin_auth");
  if (!adminAuth?.value) {
    return NextResponse.json({ error: "Unauthorized — please log in as admin." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured.", setupRequired: true }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { message, mode, history } = body as {
      message: string;
      mode: string;
      history: { role: "user" | "assistant"; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const modeHint: Record<string, string> = {
      "Manage Listings": "\n\nCurrent mode: MANAGE LISTINGS. Focus on listing CRUD operations using tools.",
      "Manage Leads":    "\n\nCurrent mode: MANAGE LEADS. Focus on lead management using tools.",
      "Write Content":   "\n\nCurrent mode: WRITE CONTENT. Generate professional real estate content. Only use tools if user explicitly wants to fetch data first.",
      "Auto":            "",
    };
    const systemPrompt = SYSTEM + (modeHint[mode] || "");

    // Build message array — history is plain text, no tool_use blocks
    const apiMessages: Anthropic.Messages.MessageParam[] = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: message },
    ];

    // ── Tool use loop ──────────────────────────────────────────────────────────
    const currentMessages: Anthropic.Messages.MessageParam[] = [...apiMessages];
    const toolsExecuted: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model:      MODEL,
        max_tokens: 2048,
        system:     systemPrompt,
        tools:      TOOLS,
        messages:   currentMessages,
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
          .map(b => b.text)
          .join("\n");
        return NextResponse.json({ reply: text || "Done.", toolsUsed: toolsExecuted });
      }

      if (response.stop_reason === "tool_use") {
        // Append assistant message with tool calls
        currentMessages.push({ role: "assistant", content: response.content });

        // Execute every tool call in this response
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await executeTool(block.name, block.input as Record<string, unknown>);
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
            toolsExecuted.push(block.name);
          }
        }

        // Append tool results and loop
        currentMessages.push({ role: "user", content: toolResults });
        continue;
      }

      // Any other stop_reason (max_tokens, etc.)
      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("\n");
      return NextResponse.json({ reply: text || "Processing complete.", toolsUsed: toolsExecuted });
    }

    return NextResponse.json({
      reply: "Reached maximum processing steps. Please try breaking your request into smaller parts.",
      toolsUsed: toolsExecuted,
    });

  } catch (err: unknown) {
    console.error("AI Brain error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI Brain error: ${msg}` }, { status: 500 });
  }
}
