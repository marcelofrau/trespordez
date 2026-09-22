(() => {
  const root = document.getElementById("backlog-catalog-grid");
  const dataEl = document.getElementById("backlog-catalog-data");
  if (!root || !dataEl || typeof globalThis.gridjs === "undefined") return;

  const raw = JSON.parse(dataEl.textContent || "[]");
  const rows = raw.map((item) => [
    item.name,
    item.platform || "—",
    item.status || "—",
    item.humor || "—",
  ]);

  const { h } = gridjs;
  const grid = new gridjs.Grid({
    columns: ["Jogo", "Plataforma", "Status", "Humor"],
    data: rows,
    sort: true,
    search: {
      enabled: true,
      placeholder: "Buscar jogo…",
    },
    pagination: {
      enabled: true,
      limit: 25,
      summary: false,
    },
    autoWidth: false,
    className: {
      table: "backlog-grid-table",
    },
    style: {
      th: { background: "var(--accent)", border: "2px solid #000", "font-family": "var(--head)" },
      td: { border: "1px solid #000" },
    },
  });

  const filters = document.querySelector(".backlog-catalog-filters");
  const platforms = [...new Set(raw.map((item) => item.platform).filter(Boolean))].sort();
  for (const platform of platforms) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "backlog-chip";
    button.dataset.platform = platform;
    button.textContent = platform;
    filters.appendChild(button);
  }

  const render = (filter) => {
    const data = filter === "*" || filter == null
      ? rows
      : rows.filter((row) => row[1] === filter);
    grid.updateConfig({ data }).forceRender();
  };

  filters.addEventListener("click", (event) => {
    const button = event.target.closest(".backlog-chip");
    if (!button) return;
    filters.querySelectorAll(".backlog-chip").forEach((chip) => chip.classList.remove("is-active"));
    button.classList.add("is-active");
    render(button.dataset.platform);
  });

  grid.render(root);
})();