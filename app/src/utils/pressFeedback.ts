const PRESSABLE_SELECTOR = [
  'button',
  '.grid-card',
  '.settings-list article',
  '.editable-tag',
  '.suggestion-chip',
].join(', ');

function isFeedbackDisabled(element: Element | null): boolean {
  return Boolean(element?.closest('[data-no-press-feedback="true"]'));
}

let activeElement: HTMLElement | null = null;
let releaseElement: HTMLElement | null = null;
let releaseTimer: number | null = null;
let pressTimer: number | null = null;
let tapElement: HTMLElement | null = null;
let tapTimer: number | null = null;
let isPointerDown = false;
const CARD_TAP_DURATION = 220;

function clearPressTimer(): void {
  if (pressTimer !== null) {
    window.clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function clearTapState(): void {
  if (tapTimer !== null) {
    window.clearTimeout(tapTimer);
    tapTimer = null;
  }

  if (tapElement) {
    tapElement.classList.remove('is-tapping');
    tapElement = null;
  }
}

function clearReleaseState(): void {
  clearPressTimer();
  clearTapState();
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

  if (isFeedbackDisabled(elementAtPoint)) {
    return null;
  }

  return elementAtPoint.closest(PRESSABLE_SELECTOR) as HTMLElement | null;
}

function handlePointerDown(event: PointerEvent): void {
  clearReleaseState();
  isPointerDown = true;
  activeElement = resolvePressableFromPoint(event.clientX, event.clientY);
  if (!activeElement?.matches('.grid-card, .settings-list article')) {
    activeElement?.classList.add('is-pressing');
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (!isPointerDown) {
    return;
  }

  const currentTarget = resolvePressableFromPoint(event.clientX, event.clientY);
  if (currentTarget === activeElement) {
    return;
  }

  if (!activeElement?.matches('.grid-card, .settings-list article')) {
    activeElement?.classList.remove('is-pressing');
  }
  clearPressTimer();
  activeElement = currentTarget;
  if (!activeElement?.matches('.grid-card, .settings-list article')) {
    activeElement?.classList.add('is-pressing');
  }
}

function handlePointerUp(event: PointerEvent): void {
  if (!isPointerDown) {
    return;
  }

  const releaseTarget = resolvePressableFromPoint(event.clientX, event.clientY);

  clearPressTimer();
  activeElement?.classList.remove('is-pressing');
  activeElement = null;
  isPointerDown = false;

  if (!releaseTarget) {
    return;
  }

  if (releaseTarget.matches('.grid-card, .settings-list article')) {
    tapElement = releaseTarget;
    tapElement.classList.add('is-tapping');
    tapTimer = window.setTimeout(() => {
      tapElement?.classList.remove('is-tapping');
      tapElement = null;
      tapTimer = null;
    }, CARD_TAP_DURATION);
    return;
  }

  releaseElement = releaseTarget;
  releaseElement.classList.add('is-releasing');
  releaseTimer = window.setTimeout(() => {
    releaseElement?.classList.remove('is-releasing');
    releaseElement = null;
    releaseTimer = null;
  }, 160);
}

function handlePointerCancel(): void {
  if (!isPointerDown) {
    return;
  }

  clearPressTimer();
  activeElement?.classList.remove('is-pressing');
  activeElement = null;
  isPointerDown = false;
}

export function setupPressFeedback(): void {
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
  window.addEventListener('scroll', clearReleaseState, { passive: true });
}
