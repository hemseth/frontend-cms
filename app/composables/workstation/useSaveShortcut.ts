import { onMounted, onBeforeUnmount } from 'vue'

/** Ctrl+S / Cmd+S runs `save` instead of the browser's "save page". */
export function useSaveShortcut(save: () => unknown, enabled: () => boolean = () => true) {
  function onKey(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (enabled()) save()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
