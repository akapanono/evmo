<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-overlay" @click="emit('cancel')">
        <section class="dialog-panel" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
          <div class="dialog-badge" :class="{ danger }"></div>
          <div class="dialog-copy">
            <p class="dialog-eyebrow">{{ eyebrow }}</p>
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>
          </div>
          <div class="dialog-actions">
            <button type="button" class="dialog-btn subtle" @click="emit('cancel')">
              {{ cancelText }}
            </button>
            <button type="button" :class="['dialog-btn', danger ? 'danger' : 'primary']" @click="emit('confirm')">
              {{ confirmText }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  eyebrow?: string;
  danger?: boolean;
}

withDefaults(defineProps<Props>(), {
  confirmText: '确认',
  cancelText: '再想想',
  eyebrow: '提示',
  danger: false,
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 180ms ease;
}

.dialog-fade-enter-active .dialog-panel,
.dialog-fade-leave-active .dialog-panel {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-panel,
.dialog-fade-leave-to .dialog-panel {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24px 18px calc(24px + env(safe-area-inset-bottom, 0px));
  background: rgba(24, 24, 22, 0.34);
  backdrop-filter: blur(14px);
}

.dialog-panel {
  width: min(100%, 420px);
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(220, 108, 86, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(255, 248, 241, 0.96));
  border: 1px solid rgba(29, 40, 49, 0.08);
  box-shadow: 0 28px 48px rgba(29, 40, 49, 0.18);
}

.dialog-badge {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(47, 138, 130, 0.22);
}

.dialog-badge.danger {
  background: rgba(220, 108, 86, 0.34);
}

.dialog-copy {
  display: grid;
  gap: 8px;
}

.dialog-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.dialog-copy h3,
.dialog-copy p {
  margin: 0;
}

.dialog-copy h3 {
  font-size: 22px;
  line-height: 1.15;
  color: var(--ink);
}

.dialog-copy p {
  color: var(--muted);
  line-height: 1.6;
}

.dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dialog-btn {
  min-height: 48px;
  border-radius: 18px;
  font-weight: 600;
}

.dialog-btn.subtle {
  background: rgba(29, 40, 49, 0.06);
  color: var(--ink);
}

.dialog-btn.primary {
  background: var(--ink);
  color: #fffaf4;
}

.dialog-btn.danger {
  background: linear-gradient(180deg, #dc6c56, #c95b45);
  color: #fffaf4;
}

@media (max-width: 520px) {
  .dialog-actions {
    grid-template-columns: 1fr;
  }
}
</style>
