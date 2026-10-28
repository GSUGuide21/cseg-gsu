'use client'
import { Switch } from '@/app-old/components/ui/Switch'

export const PageSwitch = () => (
  <div className="switch-container">
    <Switch
      label="Switch"
      options={['Off', 'On']}
      value={false}
      disabled={false}
      onChange={(value) => console.log('Value changed:', value)}
      onInput={(value) => console.log('Input event:', value)}
      onFocus={(value) => console.log('Focus event:', value)}
      onBlur={(value) => console.log('Blur event:', value)}
      onKeyDown={(value) => console.log('Key down event:', value)}
    />
  </div>
)