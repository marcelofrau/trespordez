(() => {
  if (typeof globalThis.gridjs === "undefined") return;
  const { h } = gridjs;

  const fa = (cls, label) =>
    h("span", { title: label, "aria-label": label }, h("i", { className: cls, "aria-hidden": "true" }));

  const tabs = document.querySelectorAll(".backlog-jump-tab");
  if (tabs.length) {
    const sections = document.querySelectorAll(".backlog-wrap .backlog-section");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        const id = tab.dataset.target;
        sections.forEach((section) => {
          section.hidden = section.id !== id;
        });
      });
    });
  }

  const scoreCell = (value) => {
    const v = Number(value);
    const valid = value != null && value !== "" && !Number.isNaN(v);
    return h(
      "span",
      { className: valid ? `backlog-score-chip score-${v}` : "backlog-score-chip backlog-score-empty" },
      valid ? String(value) : "–"
    );
  };

  const formatDate = (value) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "–";
  };

  const playedColumns = [
    {
      name: fa("fa-solid fa-gamepad", "Jogo"),
      formatter: (c) => h("strong", { className: "backlog-grid-name" }, String(c ?? "")),
    },
    { name: fa("fa-solid fa-box", "Plataforma"), width: "90px", className: "backlog-platform-col" },
    { name: fa("fa-solid fa-palette", "Gráficos"), width: "96px", className: "backlog-score", formatter: scoreCell },
    { name: fa("fa-solid fa-volume-high", "Som"), width: "96px", className: "backlog-score", formatter: scoreCell },
    { name: fa("fa-solid fa-bolt", "Gameplay"), width: "96px", className: "backlog-score", formatter: scoreCell },
    { name: fa("fa-solid fa-fire", "Desafio"), width: "96px", className: "backlog-score", formatter: scoreCell },
    {
      name: fa("fa-solid fa-star", "Geral"),
      width: "96px",
      className: "backlog-score",
      formatter: (c) => h("span", { className: "backlog-score-final-outer" }, scoreCell(c)),
    },
  ];

  const listColumns = [
    {
      name: fa("fa-solid fa-gamepad", "Jogo"),
      formatter: (c, row) => {
        const kids = [String(c ?? "")];
        if (row[4]) {
          kids.push(
            h("span", { className: "backlog-hot-tag" }, [
              h("i", { className: "fa-solid fa-fire", "aria-hidden": "true" }),
              " na fila",
            ])
          );
        }
        return h("strong", { className: "backlog-grid-name" }, kids);
      },
    },
    { name: fa("fa-solid fa-box", "Plataforma"), width: "90px", className: "backlog-platform-col" },
    { name: fa("fa-solid fa-calendar-plus", "Data"), width: "110px", className: "backlog-date-col", formatter: formatDate },
    { name: fa("fa-solid fa-clock", "Status"), width: "72px", className: "backlog-emoji-col", formatter: (c) => c || "–" },
    { name: "", width: "0px", className: "backlog-hot-col", formatter: (c) => c || "" },
  ];

  const readJson = (id) => {
    const el = document.getElementById(id);
    if (!el) return [];
    try {
      return JSON.parse(el.textContent || "[]");
    } catch (e) {
      return [];
    }
  };

  const buildGrid = ({ gridId, filterSelector, columns, loadItems, makeRows }) => {
    const root = document.getElementById(gridId);
    if (!root) return;

    const raw = loadItems();

    const grid = new gridjs.Grid({
      columns,
      data: makeRows(raw),
      sort: false,
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
      className: { table: "backlog-grid-table" },
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
    window.__backlogGrids[gridId.replace("backlog-", "").replace("-grid", "")] = grid;
  };

  buildGrid({
    gridId: "backlog-lista-grid",
    filterSelector: "#backlog-lista-filters",
    columns: listColumns,
    loadItems: () => [
      ...readJson("backlog-lista-hot-data").map((item) => ({ ...item, hot: true })),
      ...readJson("backlog-lista-catalog-data").map((item) => ({ ...item, hot: false })),
    ],
    makeRows: (items) =>
      items.map((item) => [
        item.name,
        item.platform || "—",
        item.added_at || "",
        item.status || "—",
        item.hot ? "na fila" : "",
      ]),
  });

  buildGrid({
    gridId: "backlog-played-grid",
    filterSelector: "#backlog-played-filters",
    columns: playedColumns,
    loadItems: () => readJson("backlog-played-data"),
    makeRows: (items) =>
      items.map((item) => [
        item.name,
        item.platform || "—",
        item.graf,
        item.som,
        item.gameplay,
        item.desafio,
        item.geral,
      ]),
  });
})();
