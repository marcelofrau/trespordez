import PhotoSwipeLightbox from "https://unpkg.com/photoswipe@5/dist/photoswipe-lightbox.esm.js";

for (const gallery of document.querySelectorAll(".post-gallery")) {
  for (const link of gallery.querySelectorAll("a")) {
    const image = link.querySelector("img");
    if (!image) continue;
    const setDimensions = () => {
      link.dataset.pswpWidth = image.naturalWidth || 1600;
      link.dataset.pswpHeight = image.naturalHeight || 900;
    };
    if (image.complete) setDimensions();
    else image.addEventListener("load", setDimensions, { once: true });
  }

  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a",
    pswpModule: () => import("https://unpkg.com/photoswipe@5/dist/photoswipe.esm.js"),
    wheelToZoom: true,
    allowMouseDrag: true,
    bgOpacity: 0.94,
  });
  lightbox.init();
}
