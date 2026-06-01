import { PenLine, Type as TypeIcon, Calendar, CheckSquare, Hash } from "lucide-react";

// Field types + default sizes expressed as fractions of the page (percentage coords)
export const FIELD_TYPES = {
  signature: { label: "Signature", icon: PenLine, w: 0.24, h: 0.06, input: "signature" },
  initials: { label: "Initials", icon: Hash, w: 0.10, h: 0.05, input: "signature" },
  date: { label: "Date", icon: Calendar, w: 0.16, h: 0.032, input: "date" },
  text: { label: "Text", icon: TypeIcon, w: 0.24, h: 0.036, input: "text" },
  checkbox: { label: "Checkbox", icon: CheckSquare, w: 0.032, h: 0.024, input: "checkbox" },
};

export const FIELD_ORDER = ["signature", "initials", "date", "text", "checkbox"];

export function hexToRgba(hex, a = 1) {
  const h = (hex || "#1FB8A6").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
