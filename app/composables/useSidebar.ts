import { inject, provide, ref } from 'vue'
import type { Ref } from 'vue'

const SIDEBAR_OPEN_KEY = Symbol.for('hono-sidebar-open')
const SIDEBAR_COLLAPSED_KEY = Symbol.for('hono-sidebar-collapsed')

export function provideSidebar(open: Ref<boolean>, collapsed: Ref<boolean>) {
  provide(SIDEBAR_OPEN_KEY, open)
  provide(SIDEBAR_COLLAPSED_KEY, collapsed)
}

export function useSidebar() {
  const open = inject<Ref<boolean>>(SIDEBAR_OPEN_KEY)
  const collapsed = inject<Ref<boolean>>(SIDEBAR_COLLAPSED_KEY)

  if (open && collapsed) {
    return {
      open,
      collapsed,
      toggleOpen: () => { open.value = !open.value },
      toggleCollapsed: () => { collapsed.value = !collapsed.value }
    }
  }

  // fallback
  const _open = ref(false)
  const _collapsed = ref(false)
  return {
    open: _open,
    collapsed: _collapsed,
    toggleOpen: () => { _open.value = !_open.value },
    toggleCollapsed: () => { _collapsed.value = !_collapsed.value }
  }
}
