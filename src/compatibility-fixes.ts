export const isWebkit = navigator.userAgent.indexOf("AppleWebKit") !== -1;

/**
 * Fixes scaleX() rendering bug on WebKit browsers
 * @see {@link https://stackoverflow.com/a/65992479/11967372}
 */
export function asTransformScaleValue(l: number): number {
  return isWebkit ? (devicePixelRatio * l) / Math.round(devicePixelRatio) : l;
}
