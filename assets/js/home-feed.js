const button = document.querySelector("[data-load-more]");

if (button) {
  const batchSize = 5;
  const cards = [...document.querySelectorAll(".post-list .post-card")];
  button.addEventListener("click", () => {
    const next = cards.filter((card) => card.hidden).slice(0, batchSize);
    next.forEach((card, index) => {
      card.hidden = false;
      requestAnimationFrame(() => {
        window.setTimeout(() => card.classList.remove("is-hidden"), index * 75);
      });
    });
    document.dispatchEvent(new CustomEvent("postsrevealed", { detail: next }));
    if (!cards.some((card) => card.hidden)) button.parentElement.remove();
  });
}
