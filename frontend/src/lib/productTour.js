export const TOUR_VERSION = "v1";

const TOUR_PENDING_PREFIX = "cs_tour_pending";
const TOUR_PENDING_USER_PREFIX = "cs_tour_pending_user";
const TOUR_AUTO_OFFERED_PREFIX = "cs_product_tour_autooffered";

export function tourStorageKey(userId, surface) {
  return `cs_product_tour_${TOUR_VERSION}_${userId}_${surface}`;
}

function pendingSessionKey(surface) {
  return `${TOUR_PENDING_PREFIX}_${surface}`;
}

function pendingUserKey(userId, surface) {
  return `${TOUR_PENDING_USER_PREFIX}_${TOUR_VERSION}_${userId}_${surface}`;
}

function autoOfferedKey(userId, surface) {
  return `${TOUR_AUTO_OFFERED_PREFIX}_${TOUR_VERSION}_${userId}_${surface}`;
}

/**
 * Queue a one-time automatic tour after signup / email verification.
 * Persists per user so the tour still runs if they verify on one device and open the app later.
 */
export function requestProductTour(surface = "app", userId = null) {
  sessionStorage.setItem(pendingSessionKey(surface), "1");
  if (userId) {
    localStorage.setItem(pendingUserKey(userId, surface), "1");
  }
}

/** True when a first-visit tour was explicitly requested and not yet consumed. */
export function peekTourPending(surface = "app", userId = null) {
  if (sessionStorage.getItem(pendingSessionKey(surface)) === "1") return true;
  if (userId && localStorage.getItem(pendingUserKey(userId, surface)) === "1") return true;
  return false;
}

export function consumeTourPending(surface = "app", userId = null) {
  if (!peekTourPending(surface, userId)) return false;
  sessionStorage.removeItem(pendingSessionKey(surface));
  if (userId) localStorage.removeItem(pendingUserKey(userId, surface));
  return true;
}

/**
 * Accepts the full user object (preferred) or a bare userId string.
 * With the full user, the account-level `tours_completed` flag from the API
 * is honoured, so the tour never auto-replays on a new device or after
 * clearing browser storage.
 */
export function hasCompletedTour(user, surface) {
  const userId = user && typeof user === "object" ? user.user_id : user;
  if (!userId) return true;
  if (user && typeof user === "object" && (user.tours_completed || []).includes(surface)) {
    return true;
  }
  return localStorage.getItem(tourStorageKey(userId, surface)) === "1";
}

export function markTourCompleted(user, surface) {
  const userId = user && typeof user === "object" ? user.user_id : user;
  if (!userId) return;
  localStorage.setItem(tourStorageKey(userId, surface), "1");
  if (user && typeof user === "object") {
    if (Array.isArray(user.tours_completed) && !user.tours_completed.includes(surface)) {
      user.tours_completed.push(surface);
    }
    // Persist on the account — best-effort, localStorage already covers this browser.
    import("@/lib/api").then(({ default: api }) =>
      api.post(`/auth/me/tours/${surface}`).catch(() => {}),
    );
  }
}

/** Automatic tour was already shown (or dismissed) — do not auto-start again. */
export function hasAutoTourBeenOffered(user, surface) {
  const userId = user && typeof user === "object" ? user.user_id : user;
  if (!userId) return true;
  if (hasCompletedTour(user, surface)) return true;
  return localStorage.getItem(autoOfferedKey(userId, surface)) === "1";
}

export function markAutoTourOffered(userId, surface) {
  if (!userId) return;
  localStorage.setItem(autoOfferedKey(userId, surface), "1");
}

function navStep(testid, title, description, side = "right") {
  return {
    element: `[data-testid="${testid}"]`,
    popover: { title, description, side, align: "start" },
  };
}

function filterExistingSteps(steps) {
  return steps.filter((step) => {
    if (!step.element) return true;
    const sel = typeof step.element === "string" ? step.element : null;
    return sel ? document.querySelector(sel) : true;
  });
}

export function buildAppTourSteps(user) {
  const steps = [
    {
      popover: {
        title: "Welcome to CivicSign",
        description:
          "Here is a quick tour of the main areas. Replay it anytime from the compass icon in the top right.",
        side: "over",
        align: "center",
      },
    },
    navStep(
      "nav-dashboard",
      "Dashboard",
      "Your home base. Track sent documents, see stats, and pick up where you left off.",
    ),
    navStep(
      "nav-new",
      "New Envelope",
      "Start here to upload a PDF or Word file, place signature fields, and send for signing.",
    ),
    navStep(
      "nav-documents",
      "Documents & seals",
      "All your envelopes in one place, plus a Sealed & verify tab to check tamper-evident seals on every signed document.",
    ),
    navStep(
      "nav-templates",
      "Templates",
      "Save prepared documents as templates and reuse them for repeat agreements.",
    ),
    navStep(
      "nav-contacts",
      "Contacts",
      "Build a signer address book so you do not retype names and emails every time.",
    ),
    navStep(
      "nav-usage",
      "Usage",
      "Check your monthly document allowance and see how your plan is tracking.",
    ),
    {
      element: '[data-testid="dashboard-new-envelope-button"]',
      popover: {
        title: "Quick send",
        description: "On the dashboard you can also jump straight into a new envelope from here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-testid="nav-settings"]',
      popover: {
        title: "Settings",
        description: "Update your profile, manage your subscription, security, and account preferences.",
        side: "bottom",
        align: "end",
      },
    },
  ];

  if (user?.role === "admin") {
    steps.push(
      navStep(
        "nav-admin",
        "Admin Console",
        "As an internal admin you can switch to the staff console to manage users, billing, and more.",
      ),
    );
  }

  return filterExistingSteps(steps);
}

const ADMIN_NAV_STEPS = [
  ["admin-nav-overview", "Overview", "Platform KPIs, recent activity, and health at a glance."],
  ["admin-nav-users", "Users", "Browse customer accounts, adjust plans, and run support workflows."],

  ["admin-nav-blog", "Blog", "Publish and edit posts that appear on the public blog."],
  ["admin-nav-careers", "Careers", "Manage job listings and review applications."],
  ["admin-nav-team", "Internal Team", "Invite staff and grant scoped console permissions."],
  ["admin-nav-orgs", "Organisations", "Shared document pools for enterprise customers."],
  ["admin-nav-billing", "Billing & Refunds", "Revenue, transactions, and refund actions."],
  ["admin-nav-audit", "Audit Log", "Immutable record of admin actions for compliance."],
  ["admin-nav-contacts", "Contact Inbox", "Customer enquiries submitted from the contact page."],
];

export function buildAdminTourSteps(user) {
  const isStaff = user?.role === "staff";

  const steps = [
    {
      popover: {
        title: isStaff ? "Welcome to the Staff Console" : "Welcome to the Admin Console",
        description:
          "A quick tour of your console. Replay it anytime from the compass icon in the top right.",
        side: "over",
        align: "center",
      },
    },
  ];

  if (isStaff && document.querySelector('[data-testid="staff-landing"]')) {
    steps.push({
      element: '[data-testid="staff-landing"]',
      popover: {
        title: "Your workspace",
        description: "Shortcuts to the areas a super-admin has granted you. More appear as permissions are added.",
        side: "bottom",
        align: "start",
      },
    });
  }

  for (const [testid, title, description] of ADMIN_NAV_STEPS) {
    steps.push(navStep(testid, title, description));
  }

  steps.push(
    {
      element: '[data-testid="admin-back-to-app"]',
      popover: {
        title: "Back to app",
        description: "Return to the customer-facing CivicSign experience at any time.",
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-testid="admin-nav-settings"]',
      popover: {
        title: "Settings",
        description: "Your profile and account preferences, shared with the main app.",
        side: "bottom",
        align: "end",
      },
    },
  );

  return filterExistingSteps(steps);
}