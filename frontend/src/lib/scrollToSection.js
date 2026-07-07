/** Sticky header offset so section titles are not hidden (mobile needs more room). */
function getScrollOffset() {
  return window.matchMedia("(max-width: 767px)").matches ? 96 : 84;
}

/** Scroll to a page section by id; retries until the element exists (SPA navigation). */
export function scrollToSection(id, { behavior = "smooth" } = {}) {
  const targetId = decodeURIComponent(String(id || "").replace(/^#/, ""));
  if (!targetId) return false;

  let attempts = 0;
  const maxAttempts = 40;

  const tryScroll = () => {
    const el = document.getElementById(targetId);
    if (el) {
      const offset = getScrollOffset();
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior });
      return true;
    }
    if (attempts < maxAttempts) {
      attempts += 1;
      requestAnimationFrame(tryScroll);
    }
    return false;
  };

  tryScroll();
  return true;
}

export function parseLinkTarget(to) {
  if (typeof to === "string") {
    const hashIndex = to.indexOf("#");
    if (hashIndex === -1) {
      return { pathname: to || "/", hash: "" };
    }
    const pathname = to.slice(0, hashIndex) || "/";
    const hash = to.slice(hashIndex);
    return { pathname, hash };
  }
  return {
    pathname: to.pathname || "/",
    hash: to.hash || "",
  };
}