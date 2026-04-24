/**
 * Map a pointer event on a canvas to image (video) pixel coordinates.
 *
 * Canvas is rendered with `object-fit: contain` over the video element of size
 * (videoWidth × videoHeight). The canvas DOM box is the same as the video's
 * displayed box. We translate clientX/clientY into the canvas's intrinsic
 * pixel space (which equals the video's intrinsic pixel space).
 *
 * Touch offset note: on touch devices the user's finger occludes the target,
 * so we lift the reported point by `touchOffsetPx` (in CSS pixels) when the
 * event came from touch.
 */
export function pointerToImageCoords(
  e: PointerEvent | React.PointerEvent,
  canvas: HTMLCanvasElement,
  imageWidth: number,
  imageHeight: number,
  touchOffsetPx = 24
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  let clientX = e.clientX;
  let clientY = e.clientY;
  if (e.pointerType === "touch") {
    clientY -= touchOffsetPx;
  }
  const cssX = clientX - rect.left;
  const cssY = clientY - rect.top;
  const sx = imageWidth / rect.width;
  const sy = imageHeight / rect.height;
  return [cssX * sx, cssY * sy];
}
