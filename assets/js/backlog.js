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

  const cellAt = (row, idx) => {
    if (!row || idx < 0) return undefined;
    if (Array.isArray(row)) return row[idx];
    if (Array.isArray(row.cells)) return row.cells[idx] ? row.cells[idx].data : undefined;
    return row[idx];
  };

  const nameCell = (value, row, { hotIdx, urlIdx }) => {
    const url = urlIdx >= 0 ? String(cellAt(row, urlIdx) ?? "") : "";
    const label = String(value ?? "");
    const inner = url
      ? h("a", { className: "backlog-grid-link", href: url }, [
          label,
          h("i", { className: "fa-solid fa-arrow-up-right-from-square backlog-grid-link-ico", "aria-hidden": "true" }),
        ])
      : h("strong", { className: "backlog-grid-name" }, label);
    const glyph = hotIdx >= 0 ? String(cellAt(row, hotIdx) ?? "") : "";
    if (!glyph) return inner;
    return h("span", { className: "backlog-grid-name-wrap" }, [
      inner,
      h("span", { className: "backlog-hot-tag", title: "Na fila de espera" }, [
        h("i", { className: `fa-solid ${glyph}`, "aria-hidden": "true" }),
        " na fila",
      ]),
    ]);
  };

  const genreCell = (value) => {
    const label = String(value ?? "").trim() || "–";
    return h("span", { className: "backlog-grid-genre", title: label, "aria-label": label }, label);
  };

  const STATUS = {
    jogando: { icon: "fa-play", label: "Jogando" },
    zerado: { icon: "fa-trophy", label: "Zerado" },
    "na-fila": { icon: "fa-floppy-disk", label: "Na fila" },
    pausado: { icon: "fa-pause", label: "Pausado" },
    arquivado: { icon: "fa-box-archive", label: "Arquivado" },
  };

  const statusCell = (value) => {
    const s = STATUS[String(value ?? "")];
    if (!s) {
      return h("span", { className: "backlog-grid-status backlog-grid-status--muted" }, value ? String(value) : "–");
    }
    return h("span", { className: "backlog-grid-status", title: s.label }, [
      h("i", { className: `fa-solid ${s.icon}`, "aria-hidden": "true" }),
      s.label,
    ]);
  };

  const hiddenCol = () => ({ name: "", hidden: true });

  const playedColumns = [
    {
      name: thHead("fa-solid fa-gamepad", "Jogo"),
      formatter: (c, row) => nameCell(c, row, { hotIdx: -1, urlIdx: 9 }),
    },
    { name: fa("fa-solid fa-calendar-plus", "Data"), width: "110px", className: "backlog-date-col", formatter: formatDate },
    { name: fa("fa-solid fa-box", "Plataforma"), width: "120px", className: "backlog-platform-col", sort: false },
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
    hiddenCol(),
  ];

  const listColumns = [
    {
      name: thHead("fa-solid fa-gamepad", "Jogo"),
      formatter: (c, row) => nameCell(c, row, { hotIdx: 5, urlIdx: 7 }),
    },
    { name: thHead("fa-solid fa-tags", "Gênero"), width: "180px", className: "backlog-genre-col", formatter: genreCell },
    { name: fa("fa-solid fa-box", "Plataforma"), width: "120px", className: "backlog-platform-col", sort: false },
    { name: fa("fa-solid fa-calendar-plus", "Data"), width: "110px", className: "backlog-date-col", formatter: formatDate },
    { name: fa("fa-solid fa-bars-progress", "Status"), width: "112px", className: "backlog-status-col", formatter: statusCell, sort: false },
    { name: "", hidden: true },
    hiddenCol(),
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

  const readMap = (id) => {
    const el = document.getElementById(id);
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (e) {
      return {};
    }
  };

  const REVIEW_URLS = readMap("backlog-review-map");
  const REVIEW_DATES = readMap("backlog-review-dates");

  const itemDate = (item) => REVIEW_DATES[item.post_slug] || item.added_at || "";

  const sortByDateDesc = (items) =>
    items
      .map((item, index) => ({ item, index, date: itemDate(item) }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.index - a.index)
      .map(({ item }) => item);

  const splitField = (value) =>
    (Array.isArray(value) ? value : String(value ?? "").split(","))
      .map((s) => s.trim())
      .filter(Boolean);

  const FILTER_ICON = { platform: "fa-box", genre: "fa-tags" };

  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  const buildFilterbar = ({ container, raw, fields, onSearch, onChange }) => {
    if (!container) return [];
    const bar = document.createElement("div");
    bar.className = "backlog-filterbar";

    const field = document.createElement("div");
    field.className = "backlog-filterbar-field";

    const ico = document.createElement("span");
    ico.className = "backlog-filterbar-ico";
    ico.innerHTML =
      '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';

    const input = document.createElement("input");
    input.type = "search";
    input.className = "backlog-filterbar-input";
    input.placeholder = "Buscar jogo…";
    input.setAttribute("aria-label", "Buscar jogo");
    input.autocomplete = "off";
    input.spellcheck = false;

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "backlog-filterbar-clear";
    clear.setAttribute("aria-label", "Limpar busca");
    clear.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    clear.hidden = true;
    const syncClear = () => {
      clear.hidden = input.value === "";
    };

    const actions = document.createElement("div");
    actions.className = "backlog-filterbar-actions";

    const controls = [];
    for (const { field: fieldKey, label } of fields) {
      const values = [...new Set(raw.flatMap((item) => splitField(item[fieldKey])))].sort((a, b) =>
        a.localeCompare(b, "pt", { numeric: true, sensitivity: "base" })
      );
      if (!values.length) continue;

      const wrap = document.createElement("div");
      wrap.className = "backlog-filter";
      wrap.dataset.field = fieldKey;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "backlog-filter-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", `Filtrar por ${label}`);
      trigger.title = `Filtrar por ${label}`;
      trigger.innerHTML =
        `<i class="fa-solid ${FILTER_ICON[fieldKey] || "fa-filter"}" aria-hidden="true"></i>` +
        `<span class="backlog-filter-count" hidden></span>` +
        `<i class="fa-solid fa-chevron-down backlog-filter-chevron" aria-hidden="true"></i>`;

      const panel = document.createElement("div");
      panel.className = "backlog-filter-panel";
      panel.hidden = true;

      const head = document.createElement("div");
      head.className = "backlog-filter-head";
      const headTitle = document.createElement("span");
      headTitle.textContent = label;
      const clearAll = document.createElement("button");
      clearAll.type = "button";
      clearAll.className = "backlog-filter-clear";
      clearAll.textContent = "Limpar";
      head.append(headTitle, clearAll);

      const chips = document.createElement("div");
      chips.className = "backlog-filter-chips";

      const selected = new Set();
      const syncCount = () => {
        const count = trigger.querySelector(".backlog-filter-count");
        if (selected.size) {
          count.textContent = selected.size;
          count.hidden = false;
          trigger.classList.add("has-selection");
        } else {
          count.hidden = true;
          trigger.classList.remove("has-selection");
        }
      };
      const close = () => {
        panel.hidden = true;
        trigger.classList.remove("is-open");
        wrap.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      };
      const open = () => {
        panel.hidden = false;
        trigger.classList.add("is-open");
        wrap.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        chips.scrollTop = 0;
      };

      for (const value of values) {
        const lab = document.createElement("label");
        lab.className = "backlog-chip-toggle";
        const chipInput = document.createElement("input");
        chipInput.type = "checkbox";
        chipInput.value = value;
        const chipSpan = document.createElement("span");
        chipSpan.textContent = value;
        lab.append(chipInput, chipSpan);
        chipInput.addEventListener("change", () => {
          if (chipInput.checked) selected.add(value);
          else selected.delete(value);
          lab.classList.toggle("is-on", chipInput.checked);
          syncCount();
          onChange();
        });
        chips.appendChild(lab);
      }

      clearAll.addEventListener("click", () => {
        selected.clear();
        chips.querySelectorAll("input").forEach((i) => {
          i.checked = false;
          i.closest("label").classList.remove("is-on");
        });
        syncCount();
        onChange();
      });

      trigger.addEventListener("click", (ev) => {
        ev.stopPropagation();
        panel.hidden ? open() : close();
      });

      panel.append(head, chips);
      wrap.append(trigger, panel);
      actions.appendChild(wrap);

      controls.push({ field: fieldKey, get: () => [...selected] });
    }

    input.addEventListener(
      "input",
      debounce(() => {
        syncClear();
        onSearch(input.value.trim());
      }, 120)
    );
    clear.addEventListener("click", () => {
      input.value = "";
      syncClear();
      onSearch("");
      input.focus();
    });

    field.append(ico, input, clear, actions);
    bar.appendChild(field);
    container.appendChild(bar);

    document.addEventListener(
      "click",
      (ev) => {
        document.querySelectorAll(".backlog-filter.is-open").forEach((openWrap) => {
          if (!openWrap.contains(ev.target)) {
            const t = openWrap.querySelector(".backlog-filter-trigger");
            if (t) t.click();
          }
        });
      },
      true
    );

    return controls;
  };

  const buildGrid = ({ gridId, filterSelector, columns, loadItems, makeRows, filterFields = [] }) => {
    const root = document.getElementById(gridId);
    if (!root) return;

    const raw = loadItems();

    const grid = new gridjs.Grid({
      columns,
      data: makeRows(raw),
      sort: { multiColumn: false },
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
    let controls = [];
    let render = () => {};
    render = () => {
      const data = raw.filter((item) =>
        controls.every((ctl) => {
          const wanted = ctl.get();
          if (!wanted.length) return true;
          return wanted.some((v) => splitField(item[ctl.field]).includes(v));
        })
      );
      grid.updateConfig({ data: makeRows(data) });
      grid.forceRender();
    };
    if (filters && filterFields.length) {
      controls = buildFilterbar({
        container: filters,
        raw,
        fields: filterFields,
        onSearch: (term) => grid.search(term),
        onChange: render,
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
        itemDate(item),
        item.status || "—",
        item.hot ? "fa-fire" : "",
        item.post_slug || "",
        item.post_slug ? REVIEW_URLS[item.post_slug] || "" : "",
      ]),
  });

  buildGrid({
    gridId: "backlog-played-grid",
    filterSelector: "#backlog-played-filters",
    columns: playedColumns,
    filterFields: [{ field: "platform", label: "Plataforma" }],
    loadItems: () => sortByDateDesc(readJson("backlog-played-data")),
    makeRows: (items) =>
      items.map((item) => [
        item.name,
        itemDate(item),
        item.platform || "—",
        item.graf,
        item.som,
        item.gameplay,
        item.desafio,
        item.geral,
        item.post_slug || "",
        item.post_slug ? REVIEW_URLS[item.post_slug] || "" : "",
      ]),
  });
})();