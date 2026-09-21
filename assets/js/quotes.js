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

  var marquee = document.querySelector('[data-quotes-marquee]');
  if (marquee) {
    show();

    setInterval(function () {
      marquee.classList.add('is-fading');
      setTimeout(function () {
        show();
      }, 600);
    }, 10000);

    function show() {
      var idx = randomIndex();
      var q = quotes[idx];
      marquee.textContent = q.source ? q.text + ' \u2014 ' + q.source : q.text;
    }

    function randomIndex() {
      if (quotes.length === 1) return 0;
      var current = marquee.textContent;
      var idx;
      var tries = 0;
      do {
        idx = Math.floor(Math.random() * quotes.length);
        tries++;
      } while (tries < 20 && quotes[idx].text === current.split(' \u2014 ')[0].trim());
      return idx;
    }
  }

  var card = document.querySelector('[data-quotes-card]');
  if (card) {
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    var block = card.querySelector('blockquote');
    if (block) block.textContent = '"' + q.text + '"';
    var cap = card.querySelector('figcaption');
    if (cap) cap.textContent = q.source ? '\u2014 ' + q.source : '';
  }
})();