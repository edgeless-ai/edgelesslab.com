const toc = document.querySelector(".toc");
const nav = toc.querySelector("nav");
const links = [...nav.querySelectorAll("a")];
const compact = window.matchMedia("(max-width: 52rem)");
const sections = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);

function fitContents() {
  toc.open = !compact.matches;
}

function setCurrent(link) {
  const current = nav.querySelector("[aria-current]");
  if (current === link) return;
  current?.removeAttribute("aria-current");
  if (!link) return;
  link.setAttribute("aria-current", "location");
  // Keep the current entry in view inside the sticky rail without moving the page.
  if (!compact.matches) {
    const top = link.offsetTop;
    if (top < nav.scrollTop || top + link.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTop = Math.max(0, top - nav.clientHeight / 3);
    }
  }
}

function markLocation() {
  setCurrent(links.find(item => item.hash === location.hash));
}

let pending = false;
function trackReading() {
  pending = false;
  const line = window.innerHeight * 0.25;
  let index = -1;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].getBoundingClientRect().top <= line) index = i;
    else break;
  }
  if (index >= 0) setCurrent(links.find(item => item.hash === `#${sections[index].id}`));
}

fitContents();
markLocation();
compact.addEventListener("change", fitContents);
window.addEventListener("hashchange", markLocation);
window.addEventListener("scroll", () => {
  if (!pending) {
    pending = true;
    requestAnimationFrame(trackReading);
  }
}, { passive: true });

nav.addEventListener("click", event => {
  if (compact.matches && event.target.closest("a") && !event.defaultPrevented &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    toc.open = false;
  }
});

// Full-size viewer for figures and plates (tap or click to zoom).
(() => {
  const dialog = document.createElement("dialog");
  dialog.className = "lia-zoom";
  dialog.setAttribute("aria-label", "Full-size figure");
  const close = document.createElement("button");
  close.type = "button"; close.textContent = "Close";
  const img = document.createElement("img");
  dialog.append(close, img);
  document.body.append(dialog);
  const open = (src, alt) => { img.src = src; img.alt = alt || ""; dialog.showModal(); dialog.scrollTo(0, 0); };
  close.addEventListener("click", () => dialog.close());
  img.addEventListener("click", () => dialog.close());
  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-zoom]");
    const pic = event.target.closest(".reading figure img");
    if (link) { event.preventDefault(); const fig = link.closest("figure"); open(link.getAttribute("href"), fig?.querySelector("img")?.alt); }
    else if (pic && !pic.closest("a")) { const z = pic.closest("figure")?.querySelector("a[data-zoom]"); open(z ? z.getAttribute("href") : pic.currentSrc || pic.src, pic.alt); }
  });
})();
