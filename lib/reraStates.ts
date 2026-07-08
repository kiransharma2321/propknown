// Official state RERA authority portals. Every URL here was checked live (HTTP request, not
// just a search-result title) before being added -- three (Delhi, Haryana, Chandigarh) could
// not be reached from this environment (connection timeout / refused, most likely IP-based
// geofencing that many Indian government sites apply to non-Indian network ranges) despite
// resolving in DNS and being independently corroborated by multiple unrelated sources; they're
// included with `unverifiedLive: true` so this is visible in the UI rather than silently
// asserted as confirmed. West Bengal explicitly uses rera.wb.gov.in, not the wbhira.in domain a
// naive guess would produce -- WBHIRA is on record as "not functional", with new WB RERA
// business handled at the RERA (not HIRA) portal.
export interface ReraState {
  code: string;
  name: string;
  authorityName: string;
  portalUrl: string;
  unverifiedLive?: boolean;
}

export const RERA_STATES: ReraState[] = [
  { code: "TG", name: "Telangana",       authorityName: "TS-RERA",   portalUrl: "https://rera.telangana.gov.in/" },
  { code: "AP", name: "Andhra Pradesh",  authorityName: "AP RERA",   portalUrl: "https://rera.ap.gov.in/RERA/Views/Home.aspx" },
  { code: "KA", name: "Karnataka",       authorityName: "K-RERA",    portalUrl: "https://rera.karnataka.gov.in/" },
  { code: "MH", name: "Maharashtra",     authorityName: "MahaRERA",  portalUrl: "https://maharera.maharashtra.gov.in/" },
  { code: "TN", name: "Tamil Nadu",      authorityName: "TNRERA",    portalUrl: "https://rera.tn.gov.in/" },
  { code: "DL", name: "Delhi (NCT)",     authorityName: "RERA Delhi", portalUrl: "https://rera.delhi.gov.in/", unverifiedLive: true },
  { code: "GJ", name: "Gujarat",         authorityName: "GujRERA",   portalUrl: "https://gujrera.gujarat.gov.in/" },
  { code: "HR", name: "Haryana",         authorityName: "HRERA",     portalUrl: "https://haryanarera.gov.in/", unverifiedLive: true },
  { code: "UP", name: "Uttar Pradesh",   authorityName: "UP RERA",   portalUrl: "https://up-rera.in/" },
  { code: "WB", name: "West Bengal",     authorityName: "WB RERA",   portalUrl: "https://rera.wb.gov.in/" },
  { code: "RJ", name: "Rajasthan",       authorityName: "RAJRERA",   portalUrl: "https://rera.rajasthan.gov.in/" },
  { code: "PB", name: "Punjab",          authorityName: "Punjab RERA", portalUrl: "https://rera.punjab.gov.in/" },
  { code: "KL", name: "Kerala",          authorityName: "K-RERA (Kerala)", portalUrl: "https://rera.kerala.gov.in/" },
  { code: "MP", name: "Madhya Pradesh",  authorityName: "MP RERA",   portalUrl: "https://www.rera.mp.gov.in/" },
  { code: "BR", name: "Bihar",           authorityName: "RERA Bihar", portalUrl: "https://rera.bihar.gov.in/" },
  { code: "OD", name: "Odisha",          authorityName: "ORERA",     portalUrl: "https://rera.odisha.gov.in/" },
  { code: "UK", name: "Uttarakhand",     authorityName: "UKRERA",    portalUrl: "https://ukrera.uk.gov.in/" },
  { code: "GA", name: "Goa",             authorityName: "Goa RERA",  portalUrl: "https://rera.goa.gov.in/" },
  { code: "CH", name: "Chandigarh",      authorityName: "RERA Chandigarh", portalUrl: "https://rera.chbonline.in/", unverifiedLive: true },
  { code: "AS", name: "Assam",           authorityName: "RERA Assam", portalUrl: "https://rera.assam.gov.in/" },
];

export function getReraState(code: string): ReraState | undefined {
  return RERA_STATES.find(s => s.code === code);
}
