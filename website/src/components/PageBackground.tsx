/**
 * The one page background: a static wash of colour and a faint dot grid.
 * Pure CSS, no animation, no blur, no compositing hints. It paints instantly;
 * the WebGL scene (WebglBackground) fades in over it once the page is idle.
 */
export function PageBackground() {
  return <div className="page-bg" aria-hidden="true" />;
}
