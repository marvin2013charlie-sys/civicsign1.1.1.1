import {
  PenLine, Type as TypeIcon, Calendar, CheckSquare, Hash, Stamp, Image as ImageIcon,
  Building2, User, Mail, CalendarClock, Briefcase, ChevronDown, Circle, Paperclip,
} from "lucide-react";

// Field types + default sizes expressed as fractions of the page (percentage coords).
// `input` drives the signer-side UI:
//   - signature  → SignatureModal (draw / type)
//   - text       → plain text input
//   - date       → date string input (auto-fills today's date)
//   - checkbox   → toggle box
//   - image      → file picker, embeds image (used for stamp / image / attachment)
//   - select     → dropdown / radio list
// `autoFill` causes the backend / signer view to pre-populate the value from
// the recipient profile (or today) when the signer opens the document.
export const FIELD_TYPES = {
  // Existing
  signature: { label: "Signature",   icon: PenLine,       w: 0.24,  h: 0.06,  input: "signature" },
  initials:  { label: "Initial",     icon: Hash,          w: 0.10,  h: 0.05,  input: "signature" },
  date:      { label: "Date",        icon: Calendar,      w: 0.16,  h: 0.032, input: "date" },
  text:      { label: "Text",        icon: TypeIcon,      w: 0.24,  h: 0.036, input: "text" },
  checkbox:  { label: "Checkbox",    icon: CheckSquare,   w: 0.032, h: 0.024, input: "checkbox" },

  // Auto-filled identity fields
  fullname:  { label: "Full name",   icon: User,          w: 0.24,  h: 0.036, input: "text",   autoFill: "name" },
  email:     { label: "Email",       icon: Mail,          w: 0.24,  h: 0.036, input: "text",   autoFill: "email" },
  company:   { label: "Company",     icon: Building2,     w: 0.24,  h: 0.036, input: "text",   autoFill: "company" },
  jobtitle:  { label: "Job title",   icon: Briefcase,     w: 0.20,  h: 0.036, input: "text",   autoFill: "job_title" },
  signdate:  { label: "Sign date",   icon: CalendarClock, w: 0.16,  h: 0.032, input: "date",   autoFill: "today" },

  // Image-style
  stamp:      { label: "Stamp",      icon: Stamp,         w: 0.14,  h: 0.07,  input: "image" },
  image:      { label: "Image",      icon: ImageIcon,     w: 0.18,  h: 0.10,  input: "image" },
  attachment: { label: "Attachment", icon: Paperclip,     w: 0.18,  h: 0.04,  input: "image" },

  // Selection
  dropdown:  { label: "Dropdown",    icon: ChevronDown,   w: 0.20,  h: 0.036, input: "select" },
  radio:     { label: "Radio",       icon: Circle,        w: 0.20,  h: 0.036, input: "select" },
};

export const FIELD_ORDER = [
  "signature", "initials",
  "stamp", "image",
  "company", "fullname",
  "email", "signdate",
  "date", "text",
  "jobtitle", "checkbox",
  "dropdown", "radio",
  "attachment",
];

export function hexToRgba(hex, a = 1) {
  const h = (hex || "#14B8A6").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
