for (const item of document.querySelectorAll(".main-nav .has-children")) {
  const toggle = item.querySelector(".nav-toggle");
  if (!toggle) continue;
  toggle.addEventListener("click", () => {
    const expanded = item.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(expanded));
  });
}

const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".main-nav");
if (menuButton && mainNav) {
  const icon = menuButton.querySelector("i");
  menuButton.addEventListener("click", () => {
    const open = mainNav.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(open));
    if (icon) {
      icon.classList.toggle("fa-bars", !open);
      icon.classList.toggle("fa-xmark", open);
    }
  });
  mainNav.addEventListener("click", (event) => {
    if (event.target.closest("a") && mainNav.classList.contains("nav-open")) {
      mainNav.classList.remove("nav-open");
      menuButton.setAttribute("aria-expanded", "false");
      if (icon) {
        icon.classList.add("fa-bars");
        icon.classList.remove("fa-xmark");
      }
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mainNav.classList.contains("nav-open")) {
      mainNav.classList.remove("nav-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.focus();
    }
  });
}
