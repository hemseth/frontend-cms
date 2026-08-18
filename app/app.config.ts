export default defineAppConfig({
  ui: {
    breadcrumb: {
      slots: {
        root: 'relative min-w-0 bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2',
        list: 'flex items-center gap-1.5',
        item: 'flex min-w-0',
        link: 'group relative flex items-center gap-1.5 text-sm min-w-0 focus-visible:outline-primary',
        linkLeadingIcon: 'shrink-0 size-5',
        linkLeadingAvatar: 'shrink-0',
        linkLeadingAvatarSize: '2xs',
        linkLabel: 'truncate',
        separator: 'flex',
        separatorIcon: 'shrink-0 size-5 text-muted'
      },
      variants: {
        active: {
          true: {
            link: 'text-primary font-semibold'
          },
          false: {
            link: 'text-muted font-medium'
          }
        },
        disabled: {
          true: {
            link: 'cursor-not-allowed opacity-75'
          }
        },
        to: {
          true: ''
        }
      },
      compoundVariants: [
        {
          disabled: false,
          active: false,
          to: true,
          class: {
            link: ['hover:text-primary', 'transition-colors']
          }
        }
      ]
    },
    header: {
      slots: {
        root: 'bg-default/75 backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50',
        container: 'flex items-center justify-between gap-3 h-full',
        left: 'lg:flex-1 flex items-center gap-1.5',
        center: 'hidden lg:flex',
        right: 'flex items-center justify-end lg:flex-1 gap-1.5',
        title:
          'shrink-0 font-bold text-xl text-highlighted flex items-end gap-1.5',
        toggle: 'lg:hidden',
        content: 'lg:hidden',
        overlay: 'lg:hidden',
        header:
          'px-4 sm:px-6 h-(--ui-header-height) shrink-0 flex items-center justify-between gap-3',
        body: 'p-4 sm:p-6 overflow-y-auto'
      },
      variants: {
        toggleSide: {
          left: {
            toggle: '-ms-1.5'
          },
          right: {
            toggle: '-me-1.5'
          }
        }
      }
    },
    card: {
      slots: {
        root: 'rounded-lg overflow-hidden',
        header: 'p-3 sm:px-3 py-2 bg-gray-50 dark:bg-gray-800',
        body: 'p-3 sm:p-3',
        footer: 'p-3 sm:px-3 py-2 bg-gray-50 dark:bg-gray-800'
      },
      variants: {
        variant: {
          solid: {
            root: 'bg-inverted text-inverted'
          },
          outline: {
            root: 'bg-default ring ring-default divide-y divide-default'
          },
          soft: {
            root: 'bg-elevated/50 divide-y divide-default'
          },
          subtle: {
            root: 'bg-elevated/50 ring ring-default divide-y divide-default'
          }
        }
      },
      defaultVariants: {
        variant: 'outline'
      }
    }
  }
})
