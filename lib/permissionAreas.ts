// Pure data -- no server-only imports -- safe for client components (the Permission Matrix
// page) as well as server routes. Single source of truth for the 20 real feature areas found
// by auditing every canRole() call site plus every currently-ungated CRM/admin route (see the
// Step 0 diagnostic). "leads" deliberately covers three UI pages (Pipeline, Contacts, Deals)
// because all three read/write the same /api/leads endpoint -- there is no way to gate them
// independently without splitting that endpoint, so one real checkbox instead of three fake ones.
export type AreaKey =
  | "leads" | "dashboard" | "lead_detail" | "followups" | "site_visits" | "bookings"
  | "channel_partners" | "leaderboard" | "training_view" | "notifications" | "ai_brain"
  | "campaigns" | "training_admin" | "submissions" | "properties" | "bulk_import"
  | "settings_integrations" | "settings_config" | "audit_log" | "user_management";

export const AREA_LABELS: Record<AreaKey, string> = {
  leads:                  "Leads / CRM Pipeline (Pipeline, Contacts, Deals)",
  dashboard:              "Executive Dashboard",
  lead_detail:            "Lead Detail & AI Scoring",
  followups:              "Follow-Ups & Reminders",
  site_visits:            "Site Visits",
  bookings:               "Bookings",
  channel_partners:       "Channel Partners",
  leaderboard:            "Sales Leaderboard",
  training_view:          "Training (My Assignments)",
  notifications:          "Notifications",
  ai_brain:               "AI Brain Chat",
  campaigns:              "Campaigns / Marketing",
  training_admin:         "Training (Admin Author/Assign)",
  submissions:            "Submissions",
  properties:             "Properties & AI Scoring",
  bulk_import:            "Bulk Import",
  settings_integrations:  "Settings — Integrations/API Keys",
  settings_config:        "Settings — Company/Lead Sources/Builders/Banks/Property Types/Email Templates",
  audit_log:              "Audit Trail",
  user_management:        "User Management",
};

export const AREA_KEYS = Object.keys(AREA_LABELS) as AreaKey[];

// Short column headers for the Permission Matrix grid -- full text lives in AREA_LABELS as the
// hover tooltip, since some labels (settings_config) are too long to fit a column header.
export const AREA_SHORT_LABELS: Record<AreaKey, string> = {
  leads:                  "Leads/Pipeline",
  dashboard:              "Dashboard",
  lead_detail:            "Lead Detail/AI",
  followups:              "Follow-Ups",
  site_visits:            "Site Visits",
  bookings:               "Bookings",
  channel_partners:       "Channel Partners",
  leaderboard:            "Leaderboard",
  training_view:          "Training (Self)",
  notifications:          "Notifications",
  ai_brain:               "AI Brain",
  campaigns:              "Campaigns",
  training_admin:         "Training (Admin)",
  submissions:            "Submissions",
  properties:             "Properties",
  bulk_import:            "Bulk Import",
  settings_integrations:  "Settings: Integrations",
  settings_config:        "Settings: Config",
  audit_log:              "Audit Trail",
  user_management:        "User Management",
};
