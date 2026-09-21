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
    var idx = Math.floor(Math.random() * quotes.length);

    var show = function () {
      var q = quotes[idx % quotes.length];
      marquee.textContent = q.text;
      marquee.classList.add('is-entering');
      marquee.classList.remove('is-entering');
    };

    show();

    setInterval(function () {
      marquee.classList.add('is-fading');
      setTimeout(function () {
        idx = (idx + 1) % quotes.length;
        show();
      }, 600);
    }, 10000);
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