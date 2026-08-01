// `server-only`'s real entrypoint throws unless the bundler resolves it through
// the "react-server" export condition. Vitest doesn't, so alias it to this no-op
// (see the `resolve.alias` entry in vitest.config.ts).
export {};
