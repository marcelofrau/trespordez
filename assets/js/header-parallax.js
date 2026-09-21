const header = document.querySelector(".site-header");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (header && !reducedMotion.matches) {
  const update = () => {
    const offset = Math.min(window.scrollY * 0.14, 28);
    header.style.setProperty("--header-parallax-y", `${-offset}px`);
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
}
