<script setup lang="ts">
import { asTransformScaleValue } from "@/compatibility-fixes";
import { FIELD_SIZE, otherPlayer, Player, type GameMatch } from "@/game";
import { CONT_SIZE, HALF_CONT_SIZE, playerClass } from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { dist, lines, mhDist, Rect, rotation, type Line } from "@/math";
import { store } from "@/store";
import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

const props = defineProps<{
  matches?: GameMatch[] | null;
  lastMove?: number;
}>();

const gameRef = store.getGame();
const resultsRef: Ref<HTMLDivElement | null> = ref(null);
let resultEls: ResultElement[] = [];
let displayedMatches: GameMatch[] | null | undefined;

const STAGGER = 120; // ms
const DURATION = 180; // ms

interface ResultElement {
  element: HTMLDivElement;
  animation: Animation;
}

/** Wraps GameMatch and adds some additional geometry information. */
class GameMatchGeometry {
  readonly player: Player | null;
  readonly line: Line | null;
  readonly rect: Rect;

  constructor(public readonly points: GameMatch) {
    const { field } = gameRef.value;
    const [[x1, y1], [x2, y2]] = points;
    this.player = field[x1][y1];
    this.line = lines.create(x1, y1, x2, y2);
    this.rect = Rect.fromPoints(x1, y1, x2, y2);
  }

  containsPoint(x: number, y: number): boolean {
    const { rect, line } = this;
    if (!rect.containsPoint(x, y) || line === null) {
      return false;
    }

    return (
      typeof line === "number" ||
      line.a === 0 ||
      Math.floor(lines.solveY(x, line)) === y
    );
  }

  intersection(other: GameMatchGeometry): [number, number] | null {
    const l1 = this.line;
    const l2 = other.line;
    if (l1 === null || l2 === null) {
      return null;
    }

    const inter = lines.intersection(l1, l2);
    if (!inter) {
      return null;
    }

    const [interX, interY] = inter;
    return this.rect.containsPoint(interX, interY) ? [interX, interY] : null;
  }
}

/**
 * Get a point shared between two or more matches of a given player.
 * @param geom - all matches
 * @param player - value of shared point
 * @returns shared point or null if there is none
 */
function getSharedPoint(
  geom: GameMatchGeometry[],
  player: Player
): [number, number] | null {
  let lastMatch: GameMatchGeometry | null = null;
  for (let index = 0; index < geom.length; index++) {
    const iMatch = geom[index];
    if (iMatch.player !== player) {
      continue;
    }

    if (lastMatch === null) {
      lastMatch = iMatch;
      continue;
    }

    const inter = iMatch.intersection(lastMatch);
    if (!inter) {
      continue;
    }

    const [interX, interY] = inter;
    return [Math.floor(interX), Math.floor(interY)];
  }

  return null;
}

function createLineLookupTable(
  geom: GameMatchGeometry[],
  player: Player
): number[][] | null {
  const table = new Array(FIELD_SIZE);
  for (let i = 0; i < FIELD_SIZE; i++) {
    table[i] = new Array(FIELD_SIZE).fill(0);
  }

  if (geom.length >= Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER))) {
    return null;
  }

  for (let im = 0; im < geom.length; im++) {
    const iMatch = geom[im];
    if (iMatch.player === player) {
      continue;
    }

    const { left: xMin, right: xMax, top: yMin, bottom: yMax } = iMatch.rect;
    const flag = 1 << im;
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        // Entries are condensed to a single number,
        // because there will never be more than a few entries.
        table[x][y] |= flag;
      }
    }
  }

  return table;
}

function testAgainstLookupTable(
  g: GameMatchGeometry,
  testedIndices: { value: number },
  geom: GameMatchGeometry[],
  indices: number
): [number, number] | null {
  if (indices === 0) {
    return null;
  }

  let ids = indices;
  let im = 0;
  do {
    const untested = ids & 1 && !((testedIndices.value >> im) & 1);

    testedIndices.value |= 1 >> im;

    if (untested) {
      const inter = g.intersection(geom[im]);
      if (inter) {
        return inter;
      }
    }

    ids <<= 1;
    im++;
  } while (ids > 0);

  return null;
}

/**
 * Returns a point which in which lines of two different players are
 * crossing each other.
 */
function getTouchpoint(
  geom: GameMatchGeometry[],
  player: Player
): [number, number] | null {
  const indices = createLineLookupTable(geom, player);
  if (!indices) {
    return null;
  }

  for (let im = 0; im < geom.length; im++) {
    const iMatch = geom[im];
    if (iMatch.player !== player) {
      continue;
    }

    let tested = { value: 0 };
    const { left: xMin, right: xMax, top: yMin, bottom: yMax } = iMatch.rect;
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const inter = testAgainstLookupTable(
          iMatch,
          tested,
          geom,
          indices[x][y]
        );
        if (inter) {
          return inter;
        }
      }
    }
  }

  return null;
}

/** Returns a copy of `GameMatch` oriented top-down. */
function orientTopDown(m: GameMatch): GameMatch {
  const [[x1, y1], [x2, y2]] = m;
  // prettier-ignore
  return y1 < y2 ? [[x1, y1], [x2, y2]] : [[x2, y2], [x1, y1]];
}

/**
 * Returns a copy of `m` oriented relative to a point.
 * @param m - match
 * @param param - point P
 * @param facingTowards - whether the first match should be facing point P
 */
function orientUsingPoint(
  m: GameMatch,
  [px, py]: [number, number],
  facingTowards = false
): GameMatch {
  const [[x1, y1], [x2, y2]] = m;
  const d1 = mhDist(px, py, x1, y1);
  const d2 = mhDist(px, py, x2, y2);
  if ((d1 < d2 || facingTowards) && !(d1 < d2 && facingTowards)) {
    // prettier-ignore
    return [[x1, y1], [x2, y2]];
  }

  // prettier-ignore
  return [[x2, y2], [x1, y1]];
}

/**
 * Returns a copy of `m` oriented using point, if available, or top-down.
 * @param m - match
 * @param p - point P
 * @param isFartherFromPoint - whether the match should be facing point P
 */
function orientLine(
  m: GameMatch,
  p?: [number, number] | null,
  isFartherFromPoint = false
): GameMatch {
  return p ? orientUsingPoint(m, p, isFartherFromPoint) : orientTopDown(m);
}

function cwLineAngle(angle: number): number {
  return angle > 0 ? angle : angle + Math.PI;
}

function ctwLineAngle(angle: number): number {
  return angle > 0 ? Math.PI - angle : angle;
}

/**
 * Get the smallest angle by which the line should be rotated to pass
 * through all specified angles.
 * @param angleFrom - initial angle
 * @param angles - angles of lines that the line should pass through
 */
function getMinLineRotation(angleFrom: number, angles: number[]): number {
  let clockwise = 0;
  let counterclockwise = 0;
  for (const ang of angles) {
    const a = ang - angleFrom;
    const cw = cwLineAngle(a);
    const ctw = ctwLineAngle(a);
    if (clockwise < cw) clockwise = cw;
    if (counterclockwise < ctw) counterclockwise = ctw;
  }

  return clockwise <= counterclockwise ? clockwise : -counterclockwise;
}

/**
 * Extends `timeline` with all matches of a given player.
 *
 * @param timeline - matches to be displayed, ordered
 * @param geom - all matches
 * @param param2 - shared point
 * @param player - player whose matches will be added
 * @param param4 - touchpoint
 */
function extendTimeline(
  timeline: GameMatch[],
  geom: GameMatchGeometry[],
  [sx, sy]: [number, number],
  player: Player,
  [tx, ty]: [number, number]
): GameMatchGeometry[] {
  const isTouchpointShared = tx === sx && ty === sy;

  let touchGeom: GameMatchGeometry | null = null;
  let touchAngle = 0;

  const clusters: { geom: GameMatchGeometry; angle: number }[] = [];
  const erroneous: GameMatchGeometry[] = [];
  for (const g of geom) {
    if (g.player !== player || !g.containsPoint(sx, sy)) {
      continue;
    }

    const isTouchpoint =
      isTouchpointShared &&
      !touchGeom &&
      g.line !== null &&
      g.containsPoint(tx, ty);

    if (isTouchpoint) {
      touchGeom = g;
      touchAngle = lines.rotation(g.line);
    } else if (g.line !== null) {
      clusters.push({ geom: g, angle: lines.rotation(g.line) });
    } else {
      erroneous.push(g);
    }
  }

  if (touchGeom) {
    timeline.push(orientUsingPoint(touchGeom.points, [tx, ty]));
  }

  const clusterAngles = clusters.map((c) => c.angle);
  const startAngle = getMinLineRotation(touchAngle, clusterAngles);

  if (startAngle >= 0) {
    clusters.sort(
      (a, b) =>
        cwLineAngle(a.angle - startAngle) - cwLineAngle(b.angle - startAngle)
    );
  } else {
    clusters.sort(
      (a, b) =>
        ctwLineAngle(a.angle - startAngle) - ctwLineAngle(b.angle - startAngle)
    );
  }

  for (const c of clusters) {
    const line = orientUsingPoint(c.geom.points, [sx, sy], !isTouchpointShared);
    timeline.push(line);
  }

  return erroneous;
}

/** Returns an ordered array of cloned game matches. */
function orderMatches(geom: GameMatchGeometry[]): GameMatch[] {
  // A cluster is a collection of lines that share one point.
  // Excess handles any points that do not fit into those clusters.
  // It should be empty if the game is played like regular connect four.

  const other = gameRef.value.state.player;
  const last = otherPlayer(other);

  const ptLast = gameUIStore.lastMove;
  const shLast = getSharedPoint(geom, last);
  const shOther = getSharedPoint(geom, other);
  const touchpoint = getTouchpoint(geom, other);

  const timeline: GameMatch[] = [];
  const erroneous: GameMatchGeometry[] = [];

  if (shLast) {
    const tp: [number, number] = ptLast ? ptLast.index : shLast;
    const e = extendTimeline(timeline, geom, shLast, last, tp);
    erroneous.push(...e);
  }

  if (shOther) {
    const tp = touchpoint ?? shOther;
    const e = extendTimeline(timeline, geom, shOther, other, tp);
    erroneous.push(...e);
  }

  if (!(shLast && shOther)) {
    for (const m of geom) {
      if (!shLast && m.player === last) {
        const line = orientLine(m.points, ptLast && ptLast.index);
        timeline.push(line);
      }
    }

    for (const m of geom) {
      if (!shOther && m.player === other) {
        const line = orientLine(m.points, ptLast && ptLast.index);
        timeline.push(line);
      }
    }
  }

  for (const e of erroneous) {
    const line = orientTopDown(e.points);
    timeline.push(line);
  }

  return timeline;
}

/** Creates an element, which draws the match on screen. */
function createResult([p1, p2]: GameMatch, delay: number): ResultElement {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const { field } = gameRef.value;
  const el = document.createElement("div");

  const rx1 = CONT_SIZE * x1 + HALF_CONT_SIZE;
  const ry1 = CONT_SIZE * y1 + HALF_CONT_SIZE;

  const length = asTransformScaleValue(dist(x1, y1, x2, y2) * CONT_SIZE);
  const translateUp = "translateY(-3px)";
  const translate = `translate(${rx1}px, ${ry1}px)`;
  const rotate = `rotate(${rotation(p1, p2)}rad)`;
  const scaleFrom = "scaleX(0)";
  const scaleTo = `scaleX(${length})`;

  const transformFrom =
    translate + " " + rotate + " " + scaleFrom + " " + translateUp;
  const transformTo =
    translate + " " + rotate + " " + scaleTo + " " + translateUp;

  el.classList.add("result", playerClass(field[x1][y1]));

  const keyframes = [
    { offset: 0, transform: transformFrom, "-webkit-transform": transformFrom },
    { offset: 1, transform: transformTo, "-webkit-transform": transformTo },
  ];
  /* global KeyframeAnimationOptions */
  const animationOptions: KeyframeAnimationOptions = {
    duration: DURATION,
    delay,
    easing: "ease-in-out",
    fill: "both",
  };
  const animation = el.animate(keyframes, animationOptions);

  return { element: el, animation };
}

watch(
  () => props.matches,
  (matches) => {
    if (!matches || matches.length === 0) {
      setResults();
      displayedMatches = matches;
      return;
    }

    const geom = Array.from(matches, (m) => new GameMatchGeometry(m));
    const results = orderMatches(geom).map((m, i) =>
      createResult(m, i * STAGGER)
    );

    setResults(results);
    displayedMatches = matches;
  },
  { immediate: true }
);

function setResults(newResults: ResultElement[] = []) {
  unmountResults();
  for (const { animation } of resultEls) {
    animation.cancel();
  }

  resultEls = newResults;
  mountResults();
}

function mountResults() {
  const resultsEl = resultsRef.value;
  if (!resultsEl) {
    return;
  }

  for (const { element } of resultEls) {
    resultsEl.appendChild(element);
  }
}

function unmountResults() {
  const resultsEl = resultsRef.value;
  if (resultsEl) {
    resultsEl.innerHTML = "";
  }
}

onMounted(mountResults);

onUnmounted(unmountResults);
</script>

<template>
  <div class="results" ref="resultsRef"></div>
</template>

<style lang="scss">
.result {
  position: absolute;
  top: 0;
  left: 0;
  height: 6px;
  width: 1px;
  transform-origin: 0 0;
  z-index: -1;

  &.p1 {
    background: linear-gradient(
      to bottom,
      var(--c-p1) calc(100% * (1 / 3)),
      var(--c-slot-p1-background) calc(100% * (1 / 3)) calc(100% * (2 / 3)),
      var(--c-p1) calc(100% * (2 / 3))
    );
  }

  &.p2 {
    background: linear-gradient(
      to bottom,
      var(--c-p2) calc(100% * (1 / 3)),
      var(--c-slot-p2-background) calc(100% * (1 / 3)) calc(100% * (2 / 3)),
      var(--c-p2) calc(100% * (2 / 3))
    );
  }
}
</style>
