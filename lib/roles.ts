// Pure role data -- no server-only imports (no bcrypt, no next/headers) -- so this is safe to
// import from client components as well as lib/rbac.ts (which re-exports these for existing
// server-side callers). Single source of truth for the Role type/labels/permissions; keeping
// it here instead of in lib/rbac.ts is what lets app/admin/users/page.tsx use the real role
// list instead of re-declaring its own.

// The original three roles are unchanged in name, meaning, and permission set -- every existing
// AdminUser row keeps working identically. "Customer" is deliberately NOT included -- customers
// already have their own separate auth system (BuyerUser), and giving them an AdminUser/RBAC
// role would mix an external, unprivileged account type into the internal staff permission
// system. "Channel Partner" is included as a role an admin can assign to a staff account for
// now, but there's no dedicated partner-facing login/portal built yet.
export type Role =
  | "master" | "manager" | "agent"
  | "super_admin" | "chairman" | "managing_director" | "ceo" | "coo"
  | "sales_manager" | "sales_executive" | "crm_executive"
  | "hr" | "marketing" | "legal" | "channel_partner";

export const ROLE_LABELS: Record<Role, string> = {
  master:  "Master Admin",
  manager: "Manager",
  agent:   "Agent",
  super_admin:       "Super Admin",
  chairman:          "Chairman",
  managing_director: "Managing Director",
  ceo:               "CEO",
  coo:               "COO",
  sales_manager:     "Sales Manager",
  sales_executive:   "Sales Executive",
  crm_executive:     "CRM Executive",
  hr:                "HR",
  marketing:         "Marketing",
  legal:             "Legal",
  channel_partner:   "Channel Partner",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  master:  ["all"],
  manager: ["leads", "submissions", "properties", "crm", "notifications", "bulk_import"],
  agent:   ["leads_assigned", "crm_assigned"],
  super_admin:       ["all"],
  chairman:          ["all"],
  managing_director: ["all"],
  ceo:               ["all"],
  coo: ["leads", "submissions", "properties", "crm", "notifications", "bulk_import", "settings", "reports"],
  sales_manager:   ["leads", "submissions", "properties", "crm", "notifications", "bulk_import"],
  sales_executive: ["leads_assigned", "crm_assigned"],
  crm_executive:   ["leads_assigned", "crm_assigned", "crm"],
  hr:              ["team_management"],
  marketing:       ["notifications", "marketing"],
  legal:           ["properties", "legal"],
  channel_partner: ["crm_assigned"],
};
