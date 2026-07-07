// Browser polyfills required before pdfjs-dist (react-pdf) or other modern
// libraries load. Keep this file dependency-free and side-effect only.

// Promise.withResolvers, required by pdfjs-dist v4+.
// Native: Chrome 119+, Safari 17.4+, Firefox 121+. Older Chromium/Edge/iOS
// versions throw "Promise.withResolvers is not a function" without this.
if (typeof Promise.withResolvers !== "function") {
  // eslint-disable-next-line no-extend-native
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
