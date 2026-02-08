export interface OrgTypeOption {
  value: string;
  label: string;
  description?: string;
  category: "business" | "public" | "specialized";
}

export const ORGANIZATION_TYPES: OrgTypeOption[] = [
  { value: "company", label: "Company / Corporation", category: "business", description: "General business corporation" },
  { value: "startup", label: "Startup", category: "business", description: "Early-stage or growth company" },
  { value: "smb", label: "Small & Medium Business (SMB)", category: "business", description: "Small to mid-sized enterprise" },
  { value: "enterprise", label: "Enterprise", category: "business", description: "Large-scale corporation" },
  { value: "government", label: "Government Agency", category: "public", description: "Federal, state, or local government" },
  { value: "public_sector", label: "Public Sector", category: "public", description: "Public services and institutions" },
  { value: "nonprofit", label: "Non-Profit Organization", category: "public", description: "Charitable or mission-driven" },
  { value: "education", label: "Educational Institution", category: "public", description: "Schools, colleges, universities" },
  { value: "healthcare", label: "Healthcare Organization", category: "specialized", description: "Hospitals, clinics, health systems" },
  { value: "financial_services", label: "Financial Services", category: "specialized", description: "Banks, investment firms, fintech" },
  { value: "insurance", label: "Insurance", category: "specialized", description: "Insurance providers and brokers" },
  { value: "consulting", label: "Consulting / Agency", category: "business", description: "Professional services firm" },
  { value: "manufacturing", label: "Manufacturing", category: "specialized", description: "Industrial and production" },
  { value: "retail", label: "Retail / E-commerce", category: "business", description: "Consumer goods and retail" },
  { value: "logistics", label: "Logistics / Transportation", category: "specialized", description: "Shipping, freight, transport" },
  { value: "energy", label: "Energy / Utilities", category: "specialized", description: "Power, oil, gas, renewables" },
  { value: "telecom", label: "Telecommunications", category: "specialized", description: "Phone, internet, networking" },
  { value: "media", label: "Media / Entertainment", category: "business", description: "Media, publishing, entertainment" },
  { value: "legal", label: "Legal Services", category: "specialized", description: "Law firms, legal counsel" },
  { value: "real_estate", label: "Real Estate", category: "business", description: "Property management, development" },
  { value: "biotech", label: "Biotechnology", category: "specialized", description: "Life sciences, pharmaceuticals" },
  { value: "technology", label: "Technology", category: "business", description: "Software, hardware, IT services" },
  { value: "construction", label: "Construction", category: "specialized", description: "Building and infrastructure" },
  { value: "hospitality", label: "Hospitality / Tourism", category: "business", description: "Hotels, restaurants, travel" },
  { value: "agriculture", label: "Agriculture", category: "specialized", description: "Farming, agribusiness" },
  { value: "defense", label: "Defense / Aerospace", category: "specialized", description: "Military, aerospace industry" },
  { value: "research", label: "Research Institution", category: "public", description: "R&D labs, think tanks" },
  { value: "other", label: "Other", category: "business", description: "Industry not listed above" },
];

const LEGACY_VALUE_MAP: Record<string, string> = {
  "COMPANY": "company",
  "STARTUP": "startup",
  "AGENCY": "consulting",
  "NONPROFIT": "nonprofit",
  "GOVERNMENT": "government",
  "EDUCATION": "education",
  "HEALTHCARE": "healthcare",
  "CONTRACTOR": "consulting",
  "OTHER": "other",
  "finance": "financial_services",
};

export function normalizeOrgType(value: string | null | undefined): string {
  if (!value) return "";
  const mapped = LEGACY_VALUE_MAP[value];
  if (mapped) return mapped;
  const found = ORGANIZATION_TYPES.find(t => t.value === value);
  if (found) return found.value;
  return value;
}

export function getOrgTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = normalizeOrgType(value);
  const found = ORGANIZATION_TYPES.find(t => t.value === normalized);
  return found?.label || value;
}

export function isValidOrgType(value: string): boolean {
  const normalized = normalizeOrgType(value);
  return ORGANIZATION_TYPES.some(t => t.value === normalized);
}

export const ORG_TYPE_VALUES = ORGANIZATION_TYPES.map(t => t.value);
