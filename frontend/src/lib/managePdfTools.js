import {
  Pencil,
  FileStack,
  Scissors,
  Minimize2,
  Droplets,
  Lock,
  LockOpen,
  FileOutput,
  FileType,
  ScanSearch,
} from "lucide-react";

export const PDF_CATEGORIES = [
  { id: "all", label: "All tools" },
  { id: "edit", label: "Edit" },
  { id: "combine", label: "Combine" },
  { id: "optimise", label: "Optimise" },
  { id: "secure", label: "Security" },
  { id: "convert", label: "Convert" },
  { id: "scan", label: "Scan" },
];

export const PDF_TOOL_GROUPS = [
  { id: "edit", label: "Edit & annotate", emoji: "✏️", bg: "var(--badge-teal-bg)" },
  { id: "combine", label: "Combine & split", emoji: "📑", bg: "var(--badge-info-bg)" },
  { id: "optimise", label: "Optimise & brand", emoji: "🎨", bg: "var(--badge-coral-bg)" },
  { id: "secure", label: "Protect & unlock", emoji: "🔐", bg: "var(--badge-success-bg)" },
  { id: "convert", label: "Convert formats", emoji: "🔄", bg: "var(--badge-teal-bg)" },
  { id: "scan", label: "Fraud & metadata", emoji: "🔍", bg: "var(--badge-info-bg)" },
];

export const PDF_HOME_TOOLS = [
  {
    id: "edit",
    category: "edit",
    testId: "pdf-mode-edit",
    icon: Pencil,
    title: "Edit PDF",
    description: "Reorder, rotate, or delete pages. Edit text, add images, highlights, shapes, checkmarks, links, and whiteout.",
    cta: "Open editor",
  },
  {
    id: "merge",
    category: "combine",
    testId: "pdf-mode-merge",
    icon: FileStack,
    title: "Merge PDF",
    description: "Combine 2–10 PDF or Word files in order. Open in the editor or go straight to Prepare Studio for signing.",
    cta: "Merge files",
  },
  {
    id: "split",
    category: "combine",
    testId: "pdf-mode-split",
    icon: Scissors,
    title: "Split PDF",
    description: "Divide one PDF into separate files by page ranges. Download a ZIP — no editor required.",
    cta: "Split document",
  },
  {
    id: "compress",
    category: "optimise",
    testId: "pdf-mode-compress",
    icon: Minimize2,
    title: "Compress PDF",
    description: "Optimise images and reduce file size. Choose quality level — ideal before email or upload.",
    cta: "Compress file",
  },
  {
    id: "watermark",
    category: "optimise",
    testId: "pdf-mode-watermark",
    icon: Droplets,
    title: "Watermark PDF",
    description: "Add CONFIDENTIAL, DRAFT, or your logo. Control opacity, rotation, colour, and which pages to stamp.",
    cta: "Add watermark",
  },
  {
    id: "protect",
    category: "secure",
    testId: "pdf-mode-protect",
    icon: Lock,
    title: "Protect PDF",
    description: "Password-protect your PDF with AES-256. Restrict printing, copying, and editing.",
    cta: "Add password",
  },
  {
    id: "unlock",
    category: "secure",
    testId: "pdf-mode-unlock",
    icon: LockOpen,
    title: "Unlock PDF",
    description: "Remove password protection when you have the correct open or owner password.",
    cta: "Remove password",
  },
  {
    id: "pdf-to-word",
    category: "convert",
    testId: "pdf-mode-pdf-to-word",
    icon: FileOutput,
    title: "PDF to Word",
    description: "Turn a PDF into an editable Word document. Best results with text-based PDFs.",
    cta: "Convert to DOCX",
  },
  {
    id: "word-to-pdf",
    category: "convert",
    testId: "pdf-mode-word-to-pdf",
    icon: FileType,
    title: "Word to PDF",
    description: "Convert a Word (.docx) file to PDF. Download or save to Documents for signing.",
    cta: "Convert to PDF",
  },
  {
    id: "ai-metadata",
    category: "scan",
    testId: "pdf-mode-ai-metadata",
    icon: ScanSearch,
    title: "AI metadata check",
    description: "Deep fraud scan — metadata, binary strings, structure, and body text for AI or altered documents.",
    cta: "Scan file",
  },
];

export function toolMatchesSearch(tool, q) {
  if (!q) return true;
  const group = PDF_TOOL_GROUPS.find((g) => g.id === tool.category);
  const hay = [tool.title, tool.description, group?.label].join(" ").toLowerCase();
  return hay.includes(q);
}