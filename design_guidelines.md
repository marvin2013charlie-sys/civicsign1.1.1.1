{
  "brand": {
    "name": "CIVICSIGN",
    "positioning": "Bold, fresh, trustworthy e-signature SaaS. Not a DocuSign-blue clone—more civic/modern: ink + teal trust + coral energy + warm paper neutrals.",
    "design_personality": [
      "Trustworthy (audit-grade clarity)",
      "Fresh startup energy (coral accents, crisp type)",
      "Precise (editor + signer flows feel engineered)",
      "Warm (paper neutrals, subtle grain)"
    ],
    "visual_metaphor": "Digital ink on warm paper: calm surfaces + precise outlines + confident accent color.",
    "do_not": [
      "Do not mimic DocuSign blue-heavy UI.",
      "Do not use transparent backgrounds with dark text—use solid surfaces.",
      "Do not use purple for AI/chat vibes (not relevant here anyway)."
    ]
  },

  "typography": {
    "google_fonts": {
      "heading": {
        "family": "Space Grotesk",
        "weights": ["400", "500", "600", "700"],
        "usage": "Headings, nav labels, stats numbers, pricing"
      },
      "body": {
        "family": "Work Sans",
        "weights": ["400", "500", "600"],
        "usage": "Body copy, form labels, tables, legal/audit trail text"
      },
      "signature_type_fonts": {
        "note": "For the Signature modal 'Type' tab, use handwriting-like fonts loaded via Google Fonts (separate from UI fonts).",
        "families": [
          { "family": "Allura", "weights": ["400"], "label": "Elegant" },
          { "family": "Caveat", "weights": ["400", "600"], "label": "Casual" },
          { "family": "Dancing Script", "weights": ["400", "600"], "label": "Classic" }
        ]
      }
    },
    "css_font_tokens": {
      "--font-heading": "'Space Grotesk', ui-sans-serif, system-ui",
      "--font-body": "'Work Sans', ui-sans-serif, system-ui",
      "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-2xl sm:text-3xl font-semibold tracking-tight",
      "h3": "text-xl sm:text-2xl font-semibold",
      "subheading": "text-base md:text-lg text-muted-foreground",
      "body": "text-sm sm:text-base leading-relaxed",
      "small": "text-xs sm:text-sm text-muted-foreground",
      "ui_label": "text-xs font-medium tracking-wide uppercase"
    }
  },

  "color_system": {
    "notes": [
      "Light theme primary is fine; keep app surfaces warm and readable.",
      "Use teal as primary (trust), coral as accent (energy), warm paper neutrals for distinctiveness.",
      "Gradients are decorative only and must follow the Gradient Restriction Rule (see end)."
    ],
    "palette_hex": {
      "ink": "#0F1720",
      "ink_2": "#16212C",
      "paper": "#F7F3EC",
      "paper_2": "#F2ECE3",
      "sand": "#D8C7A6",
      "slate": "#5C6B73",
      "teal": "#1FB8A6",
      "teal_2": "#0EA5A4",
      "coral": "#FF7A5C",
      "coral_2": "#FF6A4A",
      "success": "#16A34A",
      "warning": "#F59E0B",
      "danger": "#DC2626",
      "info": "#0284C7"
    },
    "shadcn_hsl_tokens": {
      "implementation_note": "Update /app/frontend/src/index.css :root tokens to these HSL values (convert from hex if needed). Keep dark mode optional; default to light.",
      "light": {
        "--background": "36 33% 95%",
        "--foreground": "210 33% 9%",
        "--card": "36 33% 98%",
        "--card-foreground": "210 33% 9%",
        "--popover": "36 33% 98%",
        "--popover-foreground": "210 33% 9%",
        "--primary": "173 71% 42%",
        "--primary-foreground": "0 0% 100%",
        "--secondary": "36 22% 90%",
        "--secondary-foreground": "210 33% 12%",
        "--muted": "36 18% 92%",
        "--muted-foreground": "200 10% 38%",
        "--accent": "16 100% 68%",
        "--accent-foreground": "210 33% 9%",
        "--destructive": "0 84% 55%",
        "--destructive-foreground": "0 0% 100%",
        "--border": "36 14% 84%",
        "--input": "36 14% 84%",
        "--ring": "173 71% 42%",
        "--radius": "0.75rem"
      }
    },
    "status_colors": {
      "draft": {
        "label": "Draft",
        "bg": "#F2ECE3",
        "fg": "#16212C",
        "border": "#D8C7A6"
      },
      "sent": {
        "label": "Sent",
        "bg": "#E6F7F4",
        "fg": "#0F1720",
        "border": "#1FB8A6"
      },
      "viewed": {
        "label": "Viewed",
        "bg": "#E6F2FA",
        "fg": "#0F1720",
        "border": "#0284C7"
      },
      "completed": {
        "label": "Completed",
        "bg": "#EAF7EE",
        "fg": "#0F1720",
        "border": "#16A34A"
      },
      "declined": {
        "label": "Declined",
        "bg": "#FDECEC",
        "fg": "#0F1720",
        "border": "#DC2626"
      }
    },
    "recipient_accent_colors": [
      { "name": "Teal", "hex": "#1FB8A6" },
      { "name": "Sky", "hex": "#38BDF8" },
      { "name": "Amber", "hex": "#F59E0B" },
      { "name": "Rose", "hex": "#FB7185" },
      { "name": "Lime", "hex": "#84CC16" }
    ]
  },

  "layout_and_grid": {
    "app_shell": {
      "pattern": "Left sidebar + top bar + content (dashboard). Studio uses 3-pane layout.",
      "max_width": "Marketing pages: max-w-6xl; App pages: full width with comfortable paddings",
      "page_padding": "px-4 sm:px-6 lg:px-8",
      "section_spacing": "py-14 sm:py-18",
      "card_spacing": "p-4 sm:p-6",
      "corner_radius": {
        "cards": "rounded-xl",
        "buttons": "rounded-lg",
        "chips": "rounded-full",
        "modals": "rounded-2xl"
      }
    },
    "landing_layout": {
      "hero": "Z-pattern: left copy + right product preview card (or image).",
      "features": "Bento grid (2x2 + one wide) with icons + short copy.",
      "trust_security": "Split section: compliance badges + audit trail preview.",
      "pricing_teaser": "3 cards with middle highlighted; keep copy short.",
      "cta": "Full-width band with mild gradient overlay (<=20% viewport)."
    },
    "dashboard_layout": {
      "top": "Stats row (4 cards) + primary CTA 'New envelope'",
      "middle": "Envelope table with filters + status badges",
      "right_optional": "Activity feed / reminders (collapsible on mobile)"
    },
    "prepare_studio_layout": {
      "left_panel": "Field palette (chips) + pages thumbnails (tabs).",
      "center": "PDF canvas (react-pdf) with zoom + page nav.",
      "right_panel": "Recipients + routing + field list + validation warnings.",
      "mobile": "Use Drawer/Sheet for left/right panels; keep PDF full width."
    },
    "signer_layout": {
      "pattern": "Focused reading column + sticky bottom action bar on mobile.",
      "guided_nav": "Start → Next field; highlight active field with recipient color ring."
    }
  },

  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "dropdown_menu": "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "skeleton": "/app/frontend/src/components/ui/skeleton.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "breadcrumb": "/app/frontend/src/components/ui/breadcrumb.jsx"
    },
    "buttons": {
      "variants": {
        "primary": {
          "style": "Teal fill, white text, subtle shadow",
          "tailwind": "bg-[--c-primary] text-white hover:bg-[--c-primary-hover] focus-visible:ring-[--c-ring]",
          "data_testid_examples": [
            "data-testid=\"primary-cta-button\"",
            "data-testid=\"new-envelope-button\""
          ]
        },
        "secondary": {
          "style": "Paper surface with ink text + border",
          "tailwind": "bg-white text-[--c-ink] border border-[--c-border] hover:bg-[--c-paper-2]"
        },
        "ghost": {
          "style": "No fill, ink text, hover paper tint",
          "tailwind": "bg-transparent hover:bg-[--c-paper-2]"
        },
        "danger": {
          "style": "Solid danger",
          "tailwind": "bg-red-600 text-white hover:bg-red-700"
        }
      },
      "micro_interactions": {
        "hover": "translate-y-[-1px] shadow-sm (only on buttons, not global)",
        "press": "active:translate-y-0 active:scale-[0.98]",
        "focus": "focus-visible:ring-2 focus-visible:ring-offset-2 ring uses --ring"
      }
    },
    "badges": {
      "status_badge": {
        "use": "shadcn Badge with custom classes per status",
        "tailwind_base": "rounded-full px-2.5 py-1 text-xs font-medium border",
        "examples": {
          "draft": "bg-[--status-draft-bg] text-[--status-draft-fg] border-[--status-draft-border]",
          "sent": "bg-[--status-sent-bg] text-[--status-sent-fg] border-[--status-sent-border]",
          "viewed": "bg-[--status-viewed-bg] text-[--status-viewed-fg] border-[--status-viewed-border]",
          "completed": "bg-[--status-completed-bg] text-[--status-completed-fg] border-[--status-completed-border]",
          "declined": "bg-[--status-declined-bg] text-[--status-declined-fg] border-[--status-declined-border]"
        }
      },
      "recipient_chip": {
        "use": "Pill chip showing recipient name + color dot",
        "tailwind": "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white border",
        "dot": "h-2 w-2 rounded-full"
      }
    },
    "cards_and_surfaces": {
      "surface_rules": [
        "App background uses paper (#F7F3EC) with subtle noise overlay.",
        "Cards are white or paper_2 with thin border; avoid heavy shadows.",
        "Use elevation only for floating elements (dialogs, dropdowns)."
      ],
      "shadow_language": {
        "card": "shadow-[0_1px_0_rgba(15,23,32,0.06)]",
        "floating": "shadow-[0_18px_50px_rgba(15,23,32,0.18)]",
        "focus_ring": "ring-2 ring-[hsl(var(--ring))] ring-offset-2"
      }
    }
  },

  "page_blueprints": {
    "landing_page": {
      "hero": {
        "structure": [
          "Top nav: logo + Product + Pricing + Security + Sign in",
          "Hero left: H1 + subheading + 2 CTAs",
          "Hero right: product preview card (dashboard snippet) or photo",
          "Below: trust row (SOC2-ready, Audit trail, ESIGN/UETA)"
        ],
        "primary_cta": "Start free",
        "secondary_cta": "See how it works",
        "micro_motion": "Hero preview card floats subtly on scroll (Framer Motion y: 0→-8)."
      },
      "features": {
        "bento_cards": [
          "Prepare Studio (drag fields)",
          "Signer Experience (guided next field)",
          "Audit Trail (tamper-evident)",
          "Templates (Phase 3)",
          "Integrations (webhooks/API teaser)"
        ]
      },
      "security": {
        "content": "Use icon list + short paragraphs; include 'Certificate of Completion' preview card."
      }
    },
    "auth": {
      "layout": "Split screen on desktop: left brand panel (paper texture + value props), right form card. On mobile: single column.",
      "components": ["Card", "Input", "Button", "Separator"],
      "google_button": "Secondary button with Google icon (lucide-react).",
      "testids": [
        "login-email-input",
        "login-password-input",
        "login-submit-button",
        "login-google-button",
        "register-submit-button"
      ]
    },
    "dashboard": {
      "table": "Use shadcn Table with sticky header; row click opens envelope detail.",
      "filters": "Search input + status Select + date range (Calendar in Popover).",
      "empty_state": "Illustrated card: 'No envelopes yet' + CTA 'Send your first document'.",
      "testids": [
        "dashboard-new-envelope-button",
        "envelope-search-input",
        "envelope-status-filter",
        "envelope-table",
        "envelope-row"
      ]
    },
    "upload_new": {
      "dropzone": "Large dashed card with paper background; show accepted types PDF/DOCX.",
      "progress": "Use Progress component for upload/processing.",
      "testids": ["upload-dropzone", "upload-file-input", "upload-continue-button"]
    },
    "prepare_studio": {
      "field_palette": {
        "chips": ["Signature", "Initials", "Date", "Text", "Checkbox"],
        "chip_style": "Pill chips with icon + label; draggable; on drag show ghost preview.",
        "testids": ["field-chip-signature", "field-chip-date", "field-chip-text"]
      },
      "pdf_canvas": {
        "react_pdf": "Render pages with crisp borders; show page thumbnails in ScrollArea.",
        "field_rendering": "Placed fields are absolute-positioned overlays with recipient color border + label.",
        "active_field": "Ring + subtle pulse (opacity) to indicate selection."
      },
      "recipients_panel": {
        "routing": "Tabs: Recipients / Routing / Validation",
        "recipient_rows": "Avatar + name/email + color dot + order number",
        "validation": "List missing required fields before enabling Send"
      },
      "top_toolbar": "Breadcrumb + zoom controls + 'Preview as signer' + 'Send' button",
      "testids": [
        "prepare-zoom-in-button",
        "prepare-zoom-out-button",
        "prepare-preview-button",
        "prepare-send-button",
        "recipient-add-button"
      ]
    },
    "send_review": {
      "layout": "Two-column: left summary (recipients, message), right document preview.",
      "success": "After send: show shareable link card + copy button + 'View tracking'.",
      "testids": ["send-submit-button", "send-copy-link-button"]
    },
    "envelope_detail": {
      "timeline": "Vertical timeline with events (Sent, Viewed, Signed) + timestamps; use subtle icons.",
      "audit_trail": "Monospace table for event IDs/hashes; downloadable certificate.",
      "downloads": "Buttons: Download PDF, Download Certificate",
      "testids": ["audit-trail-table", "download-completed-pdf-button", "download-certificate-button"]
    },
    "signer_flow": {
      "consent": "Consent card before starting; clear legal text in Work Sans.",
      "guided_signing": "Sticky 'Next field' button; highlight active field; show progress (e.g., 3 of 9).",
      "signature_modal": {
        "tabs": ["Draw", "Type", "Upload"],
        "draw": "Canvas with clear border + 'Clear' action",
        "type": "Font picker (Allura/Caveat/Dancing Script) + size slider",
        "upload": "Dropzone + preview + remove",
        "testids": [
          "signature-modal",
          "signature-tab-draw",
          "signature-tab-type",
          "signature-tab-upload",
          "signature-draw-canvas",
          "signature-type-input",
          "signature-upload-input",
          "signature-apply-button"
        ]
      },
      "completion": "Confirmation screen with download link + 'Email me a copy'."
    }
  },

  "motion_and_microinteractions": {
    "library": {
      "recommend": "framer-motion",
      "install": "npm i framer-motion",
      "usage": "Use for page transitions, subtle hover lift, studio panel slide-ins. Respect prefers-reduced-motion."
    },
    "principles": [
      "Motion is functional: indicate state change, focus, progress.",
      "Use short durations: 140–220ms for UI; 280–420ms for panels.",
      "Easing: cubic-bezier(0.2, 0.8, 0.2, 1)"
    ],
    "examples": {
      "button": "transition-colors duration-150; add hover shadow only on hover",
      "dialog": "fade + scale (0.98→1)",
      "studio_field_drop": "On drop: quick scale pop (1.02→1)"
    }
  },

  "data_viz_and_stats": {
    "charts": {
      "library": "recharts",
      "install": "npm i recharts",
      "use_cases": [
        "Dashboard: envelopes over time",
        "Completion rate",
        "Average time to sign"
      ],
      "style": "Use paper background, thin gridlines, teal line, coral highlight dot."
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text and interactive elements.",
      "Visible focus states on all controls (ring + offset).",
      "Keyboard navigable: studio panels, field list, signature modal tabs.",
      "prefers-reduced-motion: disable parallax and reduce animations."
    ],
    "pdf_editor_a11y": [
      "Provide a field list (right panel) that is keyboard navigable and selects/highlights fields on canvas.",
      "Announce validation errors with aria-live region (also include data-testid)."
    ]
  },

  "images": {
    "image_urls": [
      {
        "category": "landing.hero",
        "description": "Team reviewing documents (use as subtle right-side image with rounded corners)",
        "url": "https://images.pexels.com/photos/7731351/pexels-photo-7731351.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "landing.social-proof",
        "description": "People reviewing paperwork at table (use in testimonials strip or trust section)",
        "url": "https://images.pexels.com/photos/8962369/pexels-photo-8962369.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "landing.detail",
        "description": "Close-up signing contract (use in 'How it works' section)",
        "url": "https://images.pexels.com/photos/5387261/pexels-photo-5387261.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "background.texture",
        "description": "Abstract paper texture (use as very subtle background overlay with low opacity)",
        "url": "https://images.unsplash.com/photo-1509624776920-0fac24a9dfda?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "implementation_tokens": {
    "css_custom_properties": {
      "note": "Add these to :root in /app/frontend/src/index.css (alongside shadcn tokens).",
      "tokens": {
        "--c-ink": "#0F1720",
        "--c-paper": "#F7F3EC",
        "--c-paper-2": "#F2ECE3",
        "--c-border": "#E3D7C6",
        "--c-primary": "#1FB8A6",
        "--c-primary-hover": "#0EA5A4",
        "--c-accent": "#FF7A5C",
        "--c-accent-hover": "#FF6A4A"
      },
      "status_tokens": {
        "--status-draft-bg": "#F2ECE3",
        "--status-draft-fg": "#16212C",
        "--status-draft-border": "#D8C7A6",
        "--status-sent-bg": "#E6F7F4",
        "--status-sent-fg": "#0F1720",
        "--status-sent-border": "#1FB8A6",
        "--status-viewed-bg": "#E6F2FA",
        "--status-viewed-fg": "#0F1720",
        "--status-viewed-border": "#0284C7",
        "--status-completed-bg": "#EAF7EE",
        "--status-completed-fg": "#0F1720",
        "--status-completed-border": "#16A34A",
        "--status-declined-bg": "#FDECEC",
        "--status-declined-fg": "#0F1720",
        "--status-declined-border": "#DC2626"
      }
    },
    "noise_overlay_css": {
      "note": "Use a subtle CSS noise overlay on large backgrounds only (landing hero/app shell).",
      "css": ".noise-overlay{position:relative;} .noise-overlay:before{content:'';position:absolute;inset:0;background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.08\"/></svg>');mix-blend-mode:multiply;pointer-events:none;border-radius:inherit;}"
    }
  },

  "instructions_to_main_agent": {
    "global": [
      "Replace CRA default App.css centering styles; do not use .App { text-align:center }.",
      "Update /app/frontend/src/index.css tokens to match CIVICSIGN palette and fonts.",
      "Use only shadcn components from /app/frontend/src/components/ui for dropdowns, dialogs, calendar, etc.",
      "All interactive + key informational elements must include data-testid in kebab-case.",
      "Implement signature modal with Tabs (Draw/Type/Upload) using shadcn Dialog + Tabs.",
      "Prepare Studio: use Resizable panels + ScrollArea; left palette chips draggable; right recipients panel with Tabs.",
      "Use Sonner for toasts (success/error) and include data-testid on toast triggers.",
      "Avoid gradients except small decorative section backgrounds (<=20% viewport)."
    ],
    "js_files_note": "Project uses .js/.jsx. Provide components in .jsx and hooks in .js; avoid .tsx guidance.",
    "recommended_new_components": [
      "src/components/StatusBadge.jsx",
      "src/components/RecipientChip.jsx",
      "src/components/SignatureModal.jsx",
      "src/components/StudioFieldPalette.jsx",
      "src/components/StudioRecipientsPanel.jsx",
      "src/components/StudioPdfCanvas.jsx"
    ]
  },

  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
