let signatureFontsLoaded = false;
let decorativeFontsLoaded = false;

function injectStylesheet(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Signature picker / signer flow — load only when needed. */
export function loadSignatureFonts() {
  if (signatureFontsLoaded) return;
  signatureFontsLoaded = true;
  injectStylesheet(
    "https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@400;600&family=Dancing+Script:wght@400;600&display=swap",
  );
}

/** Marketing accent font (Caveat) — deferred until pricing/contact sections mount. */
export function loadDecorativeFonts() {
  if (decorativeFontsLoaded) return;
  decorativeFontsLoaded = true;
  injectStylesheet(
    "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap",
  );
}