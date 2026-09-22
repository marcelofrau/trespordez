(() => {
  if (typeof globalThis.gridjs === "undefined") return;
  const { h } = gridjs;

  const scoreCell = (value) => {
    const v = Number(value);
    const valid = value != null && value !== "" && !Number.isNaN(v);
    return h(
      "span",
      { className: valid ? `backlog-score-chip score-${v}` : "backlog-score-chip backlog-score-empty" },
      valid ? String(value) : "–"
    );
  };

  const playedColumns = [
    { name: "Jogo", formatter: (c) => h("strong", { className: "backlog-grid-name" }, c) },
    "Plataforma",
    { name: "Graf.", width: "56px", className: "backlog-score", formatter: scoreCell },
    { name: "Som", width: "56px", className: "backlog-score", formatter: scoreCell },
    { name: "Gameplay", width: "56px", className: "backlog-score", formatter: scoreCell },
    { name: "Desafio", width: "56px", className: "backlog-score", formatter: scoreCell },
    { name: "Geral", width: "64px", className: "backlog-score", formatter: (c) => h("span", { className: "backlog-score-final-outer" }, scoreCell(c)) },
    { name: "Humor", width: "70px", className: "backlog-emoji-col", formatter: (c) => c || "–" },
  ];

  const simpleColumns = [
    { name: "Jogo", formatter: (c) => h("strong", { className: "backlog-grid-name" }, c) },
    "Plataforma",
    { name: "Status", className: "backlog-emoji-col", formatter: (c) => c || "–" },
    { name: "Humor", className: "backlog-emoji-col", formatter: (c) => c || "–" },
  ];

  const buildGrid = (gridId, dataId, filterSelector, columns, isPlayed) => {
    const root = document.getElementById(gridId);
    const dataEl = document.getElementById(dataId);
    if (!root || !dataEl) return;

    const raw = JSON.parse(dataEl.textContent || "[]");
    const hash = gridId.replace("backlog-", "").replace("-grid", "");

    const makeRows = (items) => items.map((item) =>
      isPlayed
        ? [item.name, item.platform || "—", item.graf, item.som, item.gameplay, item.desafio, item.geral, item.humor || "—"]
        : [item.name, item.platform || "—", item.status || "—", item.humor || "—"]
    );

    const grid = new gridjs.Grid({
      columns,
      data: makeRows(raw),
      sort: true,
      search: {
        enabled: true,
        placeholder: "Buscar jogo…",
      },
      pagination: {
        enabled: true,
        limit: 20,
        summary: false,
      },
      autoWidth: false,
    });

    const filters = document.querySelector(filterSelector);
    if (filters) {
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
        const data = filter === "*" || filter == null ? raw : raw.filter((r) => r.platform === filter);
        grid.updateConfig({ data: makeRows(data) });
        grid.forceRender();
      };

      filters.addEventListener("click", (event) => {
        const button = event.target.closest(".backlog-chip");
        if (!button) return;
        filters.querySelectorAll(".backlog-chip").forEach((c) => c.classList.remove("is-active"));
        button.classList.add("is-active");
        render(button.dataset.platform);
      });
    }

    grid.render(root);
    window.__backlogGrids = window.__backlogGrids || {};
    window.__backlogGrids[hash] = grid;
  };

  buildGrid("backlog-queue-grid", "backlog-queue-data", "#backlog-queue-filters", simpleColumns, false);
  buildGrid("backlog-played-grid", "backlog-played-data", "#backlog-played-filters", playedColumns, true);
  buildGrid("backlog-catalog-grid", "backlog-catalog-data", ".backlog-section.backlog-catalog .backlog-catalog-filters", simpleColumns, false);
})();