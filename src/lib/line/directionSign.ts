/** 1 for left-to-right, −1 for right-to-left (where scrollLeft counts down from 0). */
export function directionSign(el: Element): 1 | -1 {
  return getComputedStyle(el).direction === "rtl" ? -1 : 1;
}
