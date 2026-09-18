// ArkType's declarations reference Node's `File` constructor through the `buffer`
// module. The browser app checks library types without Node's typings, so this
// resolves that single import to the platform constructor the browser already has.
declare module 'buffer' {
  export const File: typeof globalThis.File;
}
