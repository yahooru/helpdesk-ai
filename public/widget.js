/*!
 * HelpDesk AI widget loader.
 * Usage: <script src="https://YOUR-HELPDESK/widget.js" data-workspace="your-slug" async></script>
 * Injects one iframe (same origin as the help desk) that renders the launcher and the chat panel.
 * The iframe asks this script to resize it through postMessage; messages from other origins are ignored.
 */
(function () {
  "use strict";
  var script =
    document.currentScript ||
    document.querySelector('script[src*="/widget.js"][data-workspace]');
  if (!script) return;
  if (window.__helpdeskAiWidget) return;

  var slug = script.getAttribute("data-workspace");
  if (!slug) {
    console.warn("[HelpDesk AI] Missing data-workspace attribute on the widget script tag.");
    return;
  }
  var origin;
  try {
    origin = new URL(script.src, window.location.href).origin;
  } catch (e) {
    return;
  }
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var state = "closed";

  var CLOSED = { w: 88, h: 88 };
  var PEEK = { w: 360, h: 200 };

  var iframe = document.createElement("iframe");
  var params =
    "?page=" + encodeURIComponent(window.location.href.slice(0, 1000)) +
    "&title=" + encodeURIComponent((document.title || "").slice(0, 200)) +
    "&side=" + side;
  iframe.src = origin + "/embed/" + encodeURIComponent(slug) + params;
  iframe.title = "Customer support chat";
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("data-helpdesk-ai", "frame");
  iframe.style.cssText = [
    "position:fixed",
    "bottom:0",
    side + ":0",
    "width:" + CLOSED.w + "px",
    "height:" + CLOSED.h + "px",
    "max-width:100vw",
    "max-height:100vh",
    "border:0",
    "margin:0",
    "padding:0",
    "background:transparent",
    "color-scheme:normal",
    "z-index:2147483000",
    "display:block",
  ].join(";");

  function isSmallScreen() {
    return window.innerWidth < 640;
  }

  function apply() {
    var s = iframe.style;
    if (state === "open") {
      if (isSmallScreen()) {
        s.width = "100vw";
        s.height = "100%";
        s.top = "0";
      } else {
        s.top = "auto";
        s.width = "424px";
        s.height = Math.min(720, window.innerHeight) + "px";
      }
    } else if (state === "peek") {
      s.top = "auto";
      s.width = Math.min(PEEK.w, window.innerWidth) + "px";
      s.height = PEEK.h + "px";
    } else {
      s.top = "auto";
      s.width = CLOSED.w + "px";
      s.height = CLOSED.h + "px";
    }
  }

  function post(message) {
    if (iframe.contentWindow) {
      message.source = "helpdesk-ai-host";
      iframe.contentWindow.postMessage(message, origin);
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== "helpdesk-ai") return;
    if (data.type === "state" && (data.state === "open" || data.state === "closed" || data.state === "peek")) {
      state = data.state;
      apply();
    }
  });

  window.addEventListener("resize", apply);

  function notifyPage() {
    post({ type: "page", url: window.location.href.slice(0, 1000), title: (document.title || "").slice(0, 200) });
  }
  window.addEventListener("popstate", notifyPage);
  window.addEventListener("hashchange", notifyPage);
  var pushState = history.pushState;
  history.pushState = function () {
    var result = pushState.apply(this, arguments);
    setTimeout(notifyPage, 0);
    return result;
  };

  window.__helpdeskAiWidget = true;
  window.HelpDeskAI = {
    open: function () { post({ type: "open" }); },
    close: function () { post({ type: "close" }); },
  };

  function mount() {
    document.body.appendChild(iframe);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
