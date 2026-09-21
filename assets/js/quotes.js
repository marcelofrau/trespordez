(function () {
  'use strict';

  var blob = document.getElementById('site-quotes');
  if (!blob) return;

  var quotes;
  try {
    quotes = JSON.parse(blob.textContent);
  } catch (e) {
    return;
  }
  if (!quotes || !quotes.length) return;

  var lastIdx = -1;
  function randomIndex() {
    if (quotes.length === 1) return 0;
    var idx;
    do {
      idx = Math.floor(Math.random() * quotes.length);
    } while (idx === lastIdx);
    lastIdx = idx;
    return idx;
  }
  function quoteText(q) {
    return q.source ? q.text + ' \u2014 ' + q.source : q.text;
  }

  var marquee = document.querySelector('[data-quotes-marquee]');
  if (marquee) {
    var a = document.createElement('span');
    var b = document.createElement('span');
    a.className = 'tagline-layer';
    b.className = 'tagline-layer';
    marquee.innerHTML = '';
    marquee.appendChild(a);
    marquee.appendChild(b);

    var layers = [a, b];
    var shown = 0;

    layers[0].textContent = quoteText(quotes[randomIndex()]);
    layers[shown].classList.add('show');

    setInterval(function () {
      var next = shown ^ 1;
      layers[next].textContent = quoteText(quotes[randomIndex()]);
      layers[shown].classList.remove('show');
      layers[next].classList.add('show');
      shown = next;
    }, 5000);
  }

  var card = document.querySelector('[data-quotes-card]');
  if (card) {
    var q = quotes[randomIndex()];
    var block = card.querySelector('blockquote');
    if (block) block.textContent = '"' + q.text + '"';
    var cap = card.querySelector('figcaption');
    if (cap) cap.textContent = q.source ? '\u2014 ' + q.source : '';
  }
})();