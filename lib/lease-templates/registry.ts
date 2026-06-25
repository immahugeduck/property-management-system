import type { LeaseTemplateField } from "@/lib/types"
import { INDIANA_FIELDS, INDIANA_PAGE_SIZES, INDIANA_PAGE_COUNT } from "./indiana"
import { INDIANA_PDF_BASE64 } from "./indiana-pdf-base64"
import { APARTMENT_FIELDS, APARTMENT_PAGE_SIZES, APARTMENT_PAGE_COUNT } from "./apartment"
import { APARTMENT_PDF_BASE64 } from "./apartment-pdf-base64"

export interface DefaultTemplate {
  slug: string
  name: string
  description: string
  pageCount: number
  pageSizes: { w: number; h: number }[]
  fields: LeaseTemplateField[]
  pdfBase64: string
}

/**
 * Built-in lease templates installed via installDefaultTemplates(). Add more here
 * once their field maps exist (e.g. a text-based standard lease).
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    slug: "indiana-residential-lease",
    name: "Indiana Residential Lease Agreement",
    description: "Standard 11-page Indiana residential lease with fill-in fields and tenant e-signature.",
    pageCount: INDIANA_PAGE_COUNT,
    pageSizes: INDIANA_PAGE_SIZES as unknown as { w: number; h: number }[],
    fields: INDIANA_FIELDS,
    pdfBase64: INDIANA_PDF_BASE64,
  },
  {
    slug: "apartment-lease-e-street",
    name: "Apartment Lease (E Street Holdings)",
    description: "12-page E Street Holdings apartment lease with smoke-detector compliance form, rules, and tenant e-signature.",
    pageCount: APARTMENT_PAGE_COUNT,
    pageSizes: APARTMENT_PAGE_SIZES as unknown as { w: number; h: number }[],
    fields: APARTMENT_FIELDS,
    pdfBase64: APARTMENT_PDF_BASE64,
  },
]
