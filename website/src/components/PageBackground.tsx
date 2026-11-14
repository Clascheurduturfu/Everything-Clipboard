/**
 * The one page background: a static wash of colour and a faint dot grid.
 * Pure CSS, no animation, no blur, no compositing hints; it replaces the three
 * animated blurred blobs, the drifting dot grid and the WebGL canvas.
 */
export function PageBackground() {
  return <div className="page-bg" aria-hidden="true" />;
}
