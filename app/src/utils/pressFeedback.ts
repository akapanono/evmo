const PRESSABLE_SELECTOR = [
  'button',
  '.grid-card',
  '.settings-list article',
  '.editable-tag',
  '.suggestion-chip',
].join(', ');

let activeElement: HTMLElement | null = null;
let releaseElement: HTMLElement | null = null;
let releaseTimer: number | null = null;
let isPointerDown = false;
let dispatchingSyntheticClick = false;
let suppressNativeClickTarget: HTMLElement | null = null;
let suppressNativeClickUntil = 0;

function clearReleaseState(): void {
  if (releaseTimer !== null) {
    window.clearTimeout(releaseTimer);
    releaseTimer = null;
  }

  if (activeElement) {
    activeElement.classList.remove('is-pressing');
    activeElement = null;
  }

  if (releaseElement) {
    releaseElement.classList.remove('is-releasing');
    releaseElement = null;
  }

  isPointerDown = false;
}

function resolvePressableFromPoint(clientX: number, clientY: number): HTMLElement | null {
  const elementAtPoint = document.elementFromPoint(clientX, clientY);
  if (!(elementAtPoint instanceof Element)) {
    return null;
  }

  return elementAtPoint.closest(PRESSABLE_SELECTOR) as HTMLElement | null;
}

function handlePointerDown(event: PointerEvent): void {
  clearReleaseState();
  isPointerDown = true;
  activeElement = resolvePressableFromPoint(event.clientX, event.clientY);
  activeElement?.classList.add('is-pressing');
}

function handlePointerMove(event: PointerEvent): void {
  if (!isPointerDown) {
    return;
  }

  const currentTarget = resolvePressableFromPoint(event.clientX, event.clientY);
  if (currentTarget === activeElement) {
    return;
  }

  activeElement?.classList.remove('is-pressing');
  activeElement = currentTarget;
  activeElement?.classList.add('is-pressing');
}

function handlePointerUp(event: PointerEvent): void {
  if (!isPointerDown) {
    return;
  }

  const releaseTarget = resolvePressableFromPoint(event.clientX, event.clientY);

  activeElement?.classList.remove('is-pressing');
  activeElement = null;
  isPointerDown = false;

  if (!releaseTarget) {
    return;
  }

  releaseElement = releaseTarget;
  releaseElement.classList.add('is-releasing');
  releaseTimer = window.setTimeout(() => {
    releaseElement?.classList.remove('is-releasing');
    releaseElement = null;
    releaseTimer = null;
  }, 160);

  dispatchingSyntheticClick = true;
  releaseTarget.click();
  dispatchingSyntheticClick = false;
  suppressNativeClickTarget = releaseTarget;
  suppressNativeClickUntil = Date.now() + 400;
}

function handlePointerCancel(): void {
  if (!isPointerDown) {
    return;
  }

  activeElement?.classList.remove('is-pressing');
  activeElement = null;
  isPointerDown = false;
}

function handleClickCapture(event: MouseEvent): void {
  if (dispatchingSyntheticClick) {
    return;
  }

  if (!suppressNativeClickTarget || Date.now() > suppressNativeClickUntil) {
    suppressNativeClickTarget = null;
    suppressNativeClickUntil = 0;
    return;
  }

  if (event.composedPath().includes(suppressNativeClickTarget)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNativeClickTarget = null;
    suppressNativeClickUntil = 0;
  }
}

export function setupPressFeedback(): void {
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
  window.addEventListener('click', handleClickCapture, true);
  window.addEventListener('scroll', clearReleaseState, { passive: true });
}
