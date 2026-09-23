(() => {
  if (typeof globalThis.gridjs === "undefined") return;
  const { h } = gridjs;

  const fa = (cls, label) =>
    h("span", { title: label, "aria-label": label }, h("i", { className: cls, "aria-hidden": "true" }));

  const thHead = (cls, label) =>
    h("span", { className: "backlog-th" }, [
      h("i", { className: cls, "aria-hidden": "true" }),
      h("span", { className: "backlog-th-label" }, label),
    ]);

  const tabs = document.querySelectorAll(".backlog-jump-tab");
  if (tabs.length) {
    const sections = document.querySelectorAll(".backlog-wrap .backlog-section");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (tab.disabled) return;
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

  const nameCell = (value, row, { hotIdx, postIdx }) => {
    const slug = row[postIdx] && String(row[postIdx]);
    const label = String(value ?? "");
    const inner = slug
      ? h("a", { className: "backlog-grid-link", href: slug[0] === "/" ? slug : `/${slug}` }, [
          label,
          h("i", { className: "fa-solid fa-arrow-up-right-from-square backlog-grid-link-ico", "aria-hidden": "true" }),
        ])
      : h("strong", { className: "backlog-grid-name" }, label);
    if (hotIdx < 0 || !row[hotIdx]) return inner;
    return h("span", { className: "backlog-grid-name-wrap" }, [
      inner,
      h("span", { className: "backlog-hot-tag" }, [
        h("i", { className: "fa-solid fa-fire", "aria-hidden": "true" }),
        " na fila",
      ]),
    ]);
  };

  const genreCell = (value) => {
    const label = String(value ?? "").trim() || "–";
    return h("span", { className: "backlog-grid-genre", title: label, "aria-label": label }, label);
  };

  const hiddenCol = () => ({ name: "", hidden: true });

  const playedColumns = [
    {
      name: thHead("fa-solid fa-gamepad", "Jogo"),
      formatter: (c, row) => nameCell(c, row, { hotIdx: -1, postIdx: 7 }),
    },
    { name: thHead("fa-solid fa-box", "Plataforma"), width: "90px", className: "backlog-platform-col", sort: false },
    { name: fa("fa-solid fa-palette", "Gráficos"), width: "96px", className: "backlog-score", formatter: scoreCell, sort: false },
    { name: fa("fa-solid fa-volume-high", "Som"), width: "96px", className: "backlog-score", formatter: scoreCell, sort: false },
    { name: fa("fa-solid fa-bolt", "Gameplay"), width: "96px", className: "backlog-score", formatter: scoreCell, sort: false },
    { name: fa("fa-solid fa-fire", "Desafio"), width: "96px", className: "backlog-score", formatter: scoreCell, sort: false },
    {
      name: fa("fa-solid fa-star", "Geral"),
      width: "96px",
      className: "backlog-score",
      formatter: (c) => h("span", { className: "backlog-score-final-outer" }, scoreCell(c)),
      sort: false,
    },
    hiddenCol(),
  ];

  const listColumns = [
    {
      name: thHead("fa-solid fa-gamepad", "Jogo"),
      formatter: (c, row) => nameCell(c, row, { hotIdx: 5, postIdx: 6 }),
    },
    { name: thHead("fa-solid fa-tags", "Gênero"), width: "180px", className: "backlog-genre-col", formatter: genreCell },
    { name: thHead("fa-solid fa-box", "Plataforma"), width: "90px", className: "backlog-platform-col", sort: false },
    { name: thHead("fa-solid fa-calendar-plus", "Data"), width: "110px", className: "backlog-date-col", formatter: formatDate },
    { name: thHead("fa-solid fa-bars-progress", "Status"), width: "72px", className: "backlog-emoji-col", formatter: (c) => c || "–" },
    { name: "", hidden: true },
    hiddenCol(),
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

  const splitField = (value) =>
    (Array.isArray(value) ? value : String(value ?? "").split(","))
      .map((s) => s.trim())
      .filter(Boolean);

  const buildGrid = ({ gridId, filterSelector, columns, loadItems, makeRows, filterFields = [] }) => {
    const root = document.getElementById(gridId);
    if (!root) return;

    const raw = loadItems();

    const grid = new gridjs.Grid({
      columns,
      data: makeRows(raw),
      sort: { multiColumn: false },
      search: {
        enabled: true,
        placeholder: "Buscar jogo…",
      },
      pagination: {
        enabled: true,
        limit: 20,
        summary: false,
      },
      language: {
        pagination: {
          previous: "‹",
          next: "›",
        },
      },
      autoWidth: false,
      className: { table: "backlog-grid-table" },
    });

    const filters = document.querySelector(filterSelector);
    if (filters && filterFields.length) {
      const selects = [];
      for (const { field, label } of filterFields) {
        const values = [...new Set(raw.flatMap((item) => splitField(item[field])))].sort((a, b) =>
          a.localeCompare(b, "pt", { numeric: true, sensitivity: "base" })
        );
        if (!values.length) continue;
        const wrap = document.createElement("label");
        wrap.className = "backlog-filter";
        const text = document.createElement("span");
        text.textContent = label;
        const select = document.createElement("select");
        select.dataset.field = field;
        select.setAttribute("aria-label", `Filtrar por ${label}`);
        const all = document.createElement("option");
        all.value = "";
        all.textContent = "Todas";
        select.appendChild(all);
        for (const value of values) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        }
        wrap.append(text, select);
        filters.appendChild(wrap);
        selects.push(select);
      }

      const render = () => {
        const data = raw.filter((item) =>
          selects.every((select) => {
            const wanted = select.value;
            return !wanted || splitField(item[select.dataset.field]).includes(wanted);
          })
        );
        grid.updateConfig({ data: makeRows(data) });
        grid.forceRender();
      };
      selects.forEach((select) => select.addEventListener("change", render));
    }

    grid.render(root);
    window.__backlogGrids = window.__backlogGrids || {};
    window.__backlogGrids[gridId.replace("backlog-", "").replace("-grid", "")] = grid;
  };

  buildGrid({
    gridId: "backlog-lista-grid",
    filterSelector: "#backlog-lista-filters",
    columns: listColumns,
    filterFields: [
      { field: "platform", label: "Plataforma" },
      { field: "genre", label: "Gênero" },
    ],
    loadItems: () => [
      ...readJson("backlog-lista-hot-data").map((item) => ({ ...item, hot: true })),
      ...readJson("backlog-lista-catalog-data").map((item) => ({ ...item, hot: false })),
    ],
    makeRows: (items) =>
      items.map((item) => [
        item.name,
        item.genre || "",
        item.platform || "—",
        item.added_at || "",
        item.status || "—",
        item.hot ? "na fila" : "",
        item.post_slug || "",
      ]),
  });

  buildGrid({
    gridId: "backlog-played-grid",
    filterSelector: "#backlog-played-filters",
    columns: playedColumns,
    filterFields: [{ field: "platform", label: "Plataforma" }],
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
        item.post_slug || "",
      ]),
  });
})();