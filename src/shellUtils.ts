type Printable = string | number | boolean | undefined | null;
export function bold(str: Printable) {
  return `\x1b[1m${str}\x1b[22m`;
}
export function info(str: Printable) {
  return `\x1b[36m${str}\x1b[39m`;
}
export function success(str: Printable) {
  return `\x1b[32m${str}\x1b[39m`;
}
export function warn(str: Printable) {
  return `\x1b[33m${str}\x1b[39m`;
}
export function error(str: Printable) {
  return `\x1b[31m${str}\x1b[39m`;
}
export function dim(str: Printable) {
  return `\x1b[2m${str}\x1b[22m`;
}
