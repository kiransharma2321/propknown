// Server-only: DO NOT import from client components.
// These credentials are checked server-side via /api/auth and /api/admin/users.
export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME!,
  password: process.env.ADMIN_PASSWORD!,
};
export const CRM_CREDENTIALS = {
  username: process.env.CRM_USERNAME!,
  password: process.env.CRM_PASSWORD!,
};
