(function () {
  'use strict';

  var blob = document.getElementById('backlog-lucky-data');
  var root = document.querySelector('[data-backlog-lucky]');
  var card = document.querySelector('[data-backlog-lucky-card]');
  var btn = document.querySelector('[data-backlog-lucky-btn]');
  if (!blob || !root || !card || !btn) return;

  var raw;
  try {
    raw = JSON.parse(blob.textContent);
  } catch (e) {
    return;
  }
  var players = (raw.players || []).filter(function (p) {
    return p.candidates && p.candidates.length;
  });
  if (!players.length) return;

  function tokens(value) {
    return String(value || '')
      .split(',')
      .map(function (t) {
        return t.trim().toLowerCase();
      })
      .filter(Boolean);
  }

  var pools = players.map(function (p) {
    var aff = {};
    Object.keys(p.affinity || {}).forEach(function (g) {
      aff[String(g).toLowerCase()] = 1;
    });
    var cands = p.candidates.map(function (c) {
      var gen = tokens(c.genre);
      var match = gen.filter(function (g) {
        return aff[g];
      }).length;
      var score = match + (c.hot ? 4 : 0) + (c.reviewed ? 3 : 0) + 1;
      return {
        key: p.name + '\u0000' + String(c.name || ''),
        player: p,
        name: String(c.name || ''),
        platform: c.platform ? String(c.platform) : '',
        genre: c.genre ? String(c.genre) : '',
        hot: !!c.hot,
        reviewed: !!c.reviewed,
        url: c.url || '',
        score: score,
      };
    });
    return { player: p, cands: cands };
  });

  var all = pools.reduce(function (acc, pool) {
    return acc.concat(pool.cands);
  }, []);

  function pickWeighted(items, lastKey) {
    var pool = lastKey ? items.filter(function (i) {
      return i.key !== lastKey;
    }) : items;
    if (!pool.length) pool = items;
    var total = pool.reduce(function (s, i) {
      return s + i.score;
    }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= pool[i].score;
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  var shownKey = null;

  function render() {
    var item = pickWeighted(all, shownKey);
    shownKey = item.player.name + '\u0000' + item.name;

    var nameEl;
    if (item.url) {
      nameEl = document.createElement('a');
      nameEl.className = 'backlog-lucky-name backlog-grid-link';
      nameEl.href = item.url;
      nameEl.textContent = item.name;
      var ico = document.createElement('i');
      ico.className = 'fa-solid fa-arrow-up-right-from-square backlog-grid-link-ico';
      ico.setAttribute('aria-hidden', 'true');
      nameEl.appendChild(ico);
    } else {
      nameEl = document.createElement('strong');
      nameEl.className = 'backlog-lucky-name';
      nameEl.textContent = item.name;
    }

    var tags = document.createElement('span');
    tags.className = 'backlog-lucky-tags';
    if (item.platform) {
      var plat = document.createElement('span');
      plat.className = 'backlog-lucky-tag';
      plat.textContent = item.platform;
      tags.appendChild(plat);
    }
    if (item.hot) {
      var hot = document.createElement('span');
      hot.className = 'backlog-lucky-tag backlog-lucky-tag-hot';
      hot.textContent = 'na fila';
      tags.appendChild(hot);
    }
    if (item.reviewed) {
      var rev = document.createElement('span');
      rev.className = 'backlog-lucky-tag backlog-lucky-tag-review';
      rev.textContent = 'vai no review';
      tags.appendChild(rev);
    }

    var meta = document.createElement('span');
    meta.className = 'backlog-lucky-meta';
    var reason;
    if (item.score > 5) {
      reason = 'bate com o gosto que ' + item.player.name + ' já firmou por aqui';
    } else {
      reason = 'uma aposta no meio do catálogo de ' + item.player.name;
    }
    meta.textContent = 'Sugestão pesada pelo gosto dos players — ' + reason + '.';

    card.innerHTML = '';
    card.appendChild(nameEl);
    card.appendChild(tags);
    card.appendChild(meta);
  }

  btn.addEventListener('click', render);
  render();
})();