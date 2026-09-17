window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);

            (function () {
                function guardMainCss(link) {
                    if (!link.href || link.href.indexOf("/static/css/main.") === -1) return;
                    link.addEventListener("error", function () {
                        if (location.search.indexOf("css_retry=1") === -1) {
                            location.replace(location.pathname + "?css_retry=1" + location.hash);
                        }
                    });
                }
                function scan() {
                    document.querySelectorAll('link[rel="stylesheet"]').forEach(guardMainCss);
                }
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", scan);
                } else {
                    scan();
                }
            })();
        