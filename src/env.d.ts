/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.mjs' {
  export function checkReleaseConfig(args?: {
    manifestText?: string
    env?: Record<string, string | undefined>
  }): {
    ok: boolean
    errors: string[]
    config: Record<string, string | boolean>
  }
}
