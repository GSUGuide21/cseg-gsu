export interface KbdProps {
  /**
   * A key, or keys pressed together: "Esc", ["mod", "K"], ["Shift", "?"]. "mod" is ⌘ on
   * Apple devices and Ctrl everywhere else; "alt" is ⌥ or Alt; "shift" is ⇧ on Apple.
   */
  keys: string | string[]
  size?: 'sm' | 'md'
  className?: string
}
