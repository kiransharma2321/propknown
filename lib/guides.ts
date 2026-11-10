// Guides: hand-written articles in a typed content file (simpler than MDX for a handful of
// pages). Each guide links to the free tool it relates to. `reviewTodo` lists claims the author
// must check before the guide is promoted; guides with open TODOs show a review notice and are
// kept out of the sitemap until `reviewed` is set to true.

export interface GuideSection { heading: string; paragraphs: string[]; bullets?: string[] }

export interface Guide {
  slug: string;
  title: string;
  description: string;
  author: string;
  published: string;   // ISO date
  updated: string;     // ISO date
  tool: { label: string; href: string };
  sections: GuideSection[];
  sources: { label: string; url: string }[];
  reviewed: boolean;
  reviewTodo: string[];
}

export const AUTHOR = "Pinnelli Raghukiran";

export const GUIDES: Guide[] = [
  {
    slug: "how-to-check-tg-rera-number-before-token",
    title: "How to Check a TG RERA Number Before You Pay a Token",
    description: "A step-by-step check of a Telangana RERA registration on the official portal, and what to look for, before you hand over a token advance for a flat or plot.",
    author: AUTHOR,
    published: "2026-11-10",
    updated: "2026-11-10",
    tool: { label: "Run a free RERA & fraud check", href: "/legal-shield" },
    reviewed: false,
    reviewTodo: [
      "Confirm the TG RERA portal address and the search steps (registration number / project / promoter).",
      "Confirm the registration number format shown (letter P or A followed by 11 digits, e.g. P02400001234).",
      "Confirm the 500 sq.m / 8-unit registration threshold (RERA Act 2016, section 3) and any Telangana-specific rule.",
      "Confirm the 10% advance limit before a registered agreement for sale (RERA Act 2016, section 13).",
      "Check every other sentence against the Act and the TG RERA portal before setting reviewed: true.",
    ],
    sections: [
      {
        heading: "Why check before the token",
        paragraphs: [
          "A token advance is often the first money you pay, and the hardest to get back. Checking the project's RERA registration first takes about ten minutes and tells you whether the project is registered, who the promoter is, and what was promised to the regulator.",
        ],
      },
      {
        heading: "Step 1: Get the RERA number in writing",
        paragraphs: [
          "Ask the builder or broker for the project's TG RERA registration number on the brochure, booking form or an email. Telangana project numbers usually look like a letter followed by 11 digits, for example P02400001234.",
          "If the seller cannot give a number, or says registration is 'in process', treat that as a red flag for a project that should be registered.",
        ],
      },
      {
        heading: "Step 2: Search it on the official portal",
        paragraphs: [
          "Open the Telangana RERA website and use its project search. Search by the registration number, and also by the project and promoter name, to make sure they all point to the same project.",
        ],
        bullets: [
          "The promoter (company) name matches the one on your booking form.",
          "The project name, location and survey numbers match what you were shown.",
          "The registration is valid, and note the declared completion date.",
          "The number of units and the approved layout or building plan match the brochure.",
        ],
      },
      {
        heading: "Step 3: Read the documents, not just the summary",
        paragraphs: [
          "Registered projects upload documents such as the approved plans and land title details. Open them and check the block or tower and floor you are being offered actually exist in the approved plan.",
          "Look for quarterly progress updates and any orders or complaints listed against the project or promoter.",
        ],
      },
      {
        heading: "Step 4: Keep the token small and in writing",
        paragraphs: [
          "Under the RERA Act, a promoter cannot take more than 10% of the cost as an advance or application fee before a registered agreement for sale. Pay by bank transfer or cheque, never cash, and get a receipt that names the unit, the price and the refund terms.",
        ],
      },
      {
        heading: "Step 5: Check the price too",
        paragraphs: [
          "A registered project can still be overpriced. Compare the asking price with the area's typical rate and work out the true cost with stamp duty, registration and GST before you commit.",
        ],
      },
    ],
    sources: [
      { label: "Telangana RERA (official portal)", url: "https://rera.telangana.gov.in/" },
      { label: "Real Estate (Regulation and Development) Act, 2016", url: "https://www.indiacode.nic.in/handle/123456789/2158" },
    ],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
