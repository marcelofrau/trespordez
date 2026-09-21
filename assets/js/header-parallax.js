const header = document.querySelector(".site-header");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (header && !reducedMotion.matches) {
  const update = () => {
    const offset = Math.min(window.scrollY * 0.28, 72);
    header.style.setProperty("--header-parallax-scroll", `${-offset}px`);
  };

  window.addEventListener("scroll", update, { passive: true });
  header.addEventListener("pointermove", (event) => {
    const bounds = header.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 26;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 18;
    header.style.setProperty("--header-parallax-x", `${x}px`);
    header.style.setProperty("--header-parallax-pointer-y", `${y}px`);
  });
  header.addEventListener("pointerleave", () => {
    header.style.setProperty("--header-parallax-x", "0px");
    header.style.setProperty("--header-parallax-pointer-y", "0px");
  });
  update();
}
