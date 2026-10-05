/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

/**
 * Build-time constant: true only for `vite dev` and the /try/ trial build.
 * In a production desktop build this is the literal `false`, so every branch
 * guarded by it is eliminated — do NOT replace it with a runtime check. See the
 * comment in vite.config.ts for why the runtime version shipped a Pro backdoor.
 */
declare const __TEST_MODE__: boolean;
