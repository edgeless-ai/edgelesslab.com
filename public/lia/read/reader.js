const toc = document.querySelector(".toc");
const compact = window.matchMedia("(max-width: 52rem)");

function fitContents() {
  toc.open = !compact.matches;
}

function markLocation() {
  toc.querySelector("[aria-current]")?.removeAttribute("aria-current");
  const link = [...toc.querySelectorAll("nav a")].find(item => item.hash === location.hash);
  link?.setAttribute("aria-current", "location");
}

fitContents();
markLocation();
compact.addEventListener("change", fitContents);
window.addEventListener("hashchange", markLocation);

toc.querySelector("nav").addEventListener("click", event => {
  if (compact.matches && event.target.closest("a") && !event.defaultPrevented &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    toc.open = false;
  }
});
