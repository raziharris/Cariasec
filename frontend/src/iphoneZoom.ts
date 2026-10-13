export function lockIPhoneZoom() {
  if (!/iPhone|iPod/.test(navigator.userAgent)) return;

  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no",
    );
  document.documentElement.classList.add("iphone-zoom-locked");

  const preventGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  const preventMultiTouch = (event: TouchEvent) => {
    if (event.touches.length > 1) preventGesture(event);
  };

  // iOS Safari may ignore the viewport zoom limit; cancel its pinch gestures.
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, {
    passive: false,
  });
  document.addEventListener("touchstart", preventMultiTouch, { passive: false });
  document.addEventListener("touchmove", preventMultiTouch, { passive: false });
}
