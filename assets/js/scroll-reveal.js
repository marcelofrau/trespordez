const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotion.matches) {
  document.body.classList.add("motion-ready");
  // Delay until first paint so browsers have an initial state to animate from.
  window.setTimeout(() => document.body.classList.add("page-loaded"), 220);
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const reveal = (element) => {
    element.classList.add("reveal-pending");
    observer.observe(element);
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      window.setTimeout(() => entry.target.classList.add("is-revealed"), 35);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.05, rootMargin: "0px 0px 140px 0px" });

  document.querySelectorAll(".post-card:not([hidden]), .sidebar section, .post-header, .post-cover, .post-content, .review-score").forEach(reveal);

  document.addEventListener("postsrevealed", (event) => {
    event.detail.forEach(reveal);
  });
}
