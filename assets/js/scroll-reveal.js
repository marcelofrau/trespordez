const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotion.matches) {
  document.body.classList.add("motion-ready");
  window.addEventListener("load", () => requestAnimationFrame(() => document.body.classList.add("page-loaded")), { once: true });
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const reveal = (element) => {
    element.classList.add("reveal-pending");
    observer.observe(element);
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -45px" });

  document.querySelectorAll(".post-card:not([hidden]), .sidebar section, .post-header, .post-cover, .post-content, .review-score").forEach(reveal);

  document.addEventListener("postsrevealed", (event) => {
    event.detail.forEach(reveal);
  });
}
