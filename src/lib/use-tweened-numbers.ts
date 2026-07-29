'use client'

import { useEffect, useRef, useState } from 'react'

/** Matches --ease-out-quint in globals.css, so JS and CSS motion decelerate alike. */
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5

/**
 * Interpolates a fixed-length array of numbers toward `target`.
 *
 * SVG `points` is an attribute, not a CSS property, so a radar or sparkline
 * whose vertices change has nothing for CSS to transition — it snaps. Tweening
 * the underlying numbers and recomputing the geometry each frame is what turns
 * a filter change from a cut into a move.
 *
 * Pass every series that shares one moment as a single flat array and slice it
 * at the call site. One array is one animation clock and one state update per
 * frame; five hooks would be five rAF loops racing each other to re-render the
 * same subtree.
 */
export function useTweenedNumbers(target: number[], ms = 320): number[] {
  const [current, setCurrent] = useState(target)
  const from = useRef(target)

  /*
   * The effect depends on the serialised values rather than the array, which is
   * a fresh identity on every render and would re-fire the tween forever. The
   * target is then rebuilt from that string instead of being read through a ref:
   * number → string → number round-trips exactly for IEEE doubles, and it keeps
   * the dependency list honest rather than lying about what the effect reads.
   */
  const key = target.join(',')

  useEffect(() => {
    const to = key.split(',').map(Number)
    const start = from.current

    // A length change means the series itself was swapped, not moved — there is
    // no meaningful path between six axes and four, so cut rather than tween.
    if (start.length !== to.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = to
      setCurrent(to)
      return
    }

    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const eased = easeOutQuint(t)
      const next = to.map((v, i) => start[i] + (v - start[i]) * eased)
      // Recording the painted frame means an interruption mid-flight resumes
      // from where the shape actually is, not from where the last one began.
      from.current = next
      setCurrent(next)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [key, ms])

  return current
}
