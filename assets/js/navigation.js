for (const item of document.querySelectorAll(".main-nav .has-children")) {
  const toggle = item.querySelector(".nav-toggle");
  if (!toggle) continue;
  toggle.addEventListener("click", () => {
    const expanded = item.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(expanded));
  });
}
