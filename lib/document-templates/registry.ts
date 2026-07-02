import { PM_AGREEMENT_PDF_BASE64 } from "./pm-agreement-base64"

export interface DefaultDocumentTemplate {
  slug: string
  /** File name shown in the Files library. */
  name: string
  description: string
  sizeBytes: number
  pdfBase64: string
}

/**
 * Built-in, non-fillable document templates seeded into a manager's Files
 * library (is_template = true) via installDocumentTemplates(). These are flat
 * reference PDFs to download, print, or send — not part of the e-sign flow.
 */
export const DEFAULT_DOCUMENT_TEMPLATES: DefaultDocumentTemplate[] = [
  {
    slug: "property-management-agreement",
    name: "Property Management Agreement.pdf",
    description: "Standard property management agreement between the manager and a property owner.",
    sizeBytes: 165151,
    pdfBase64: PM_AGREEMENT_PDF_BASE64,
  },
]
