const menu = document.querySelector("#site-context-menu");

if (menu) {
  const hide = () => { menu.hidden = true; };
  const isEditable = (element) => element.closest("input, textarea, select, [contenteditable='true']");

  document.addEventListener("contextmenu", (event) => {
    if (event.ctrlKey || isEditable(event.target)) return;
    event.preventDefault();
    menu.hidden = false;
    const { innerWidth, innerHeight } = window;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    menu.style.left = `${Math.min(event.clientX, innerWidth - width - 12)}px`;
    menu.style.top = `${Math.min(event.clientY, innerHeight - height - 12)}px`;
  });

  document.addEventListener("click", hide);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
  menu.addEventListener("click", async (event) => {
    const action = event.target.dataset.contextAction;
    if (!action) return;
    if (action === "copy-link") await navigator.clipboard.writeText(location.href);
    if (action === "copy-title") await navigator.clipboard.writeText(document.title);
    if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    hide();
  });
}
