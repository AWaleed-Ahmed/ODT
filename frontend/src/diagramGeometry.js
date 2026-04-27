/**
 * Edge-to-edge connector geometry so arrow markers sit on visible lines,
 * plus parallel offsets when multiple links share the same node pair (e.g. A→B and B→A).
 * Ellipse borders for use-case ovals; UML Sequence uses horizontal message lines between lifelines.
 */

export function getCenter(el) {
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

/** Stable bundle of connectors between the same two elements (order-insensitive). */
export function bundleOffsetPx(connectors, connector, spacing = 16) {
  const a = connector.fromElement;
  const b = connector.toElement;
  const bundle = connectors.filter(
    (o) =>
      (o.fromElement === a && o.toElement === b) ||
      (o.fromElement === b && o.toElement === a)
  );
  bundle.sort((x, y) => String(x.id).localeCompare(String(y.id)));
  const idx = bundle.findIndex((o) => o.id === connector.id);
  const n = bundle.length;
  return (idx - (n - 1) / 2) * spacing;
}

/** Header band height for UML sequence participant boxes (lifeline starts below). */
export const PARTICIPANT_HEADER_PX = 42;

function isSequenceTemplate(template) {
  const t = String(template || '').trim().toLowerCase();
  return t === 'uml sequence' || t === 'sequence';
}

/** Y level for participant↔participant messages: stacked in the overlapping lifeline band. */
function sequenceMessageY(fromEl, toEl, elements, connectors, conn) {
  const header = PARTICIPANT_HEADER_PX;
  const pp = connectors
    .filter((c) => {
      const a = elements.find((e) => e.id === c.fromElement);
      const b = elements.find((e) => e.id === c.toElement);
      return a?.type === 'participant' && b?.type === 'participant';
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const idx = Math.max(0, pp.findIndex((x) => x.id === conn.id));
  const yMin = Math.max(fromEl.y + header + 10, toEl.y + header + 10);
  const yMax = Math.min(fromEl.y + fromEl.height - 12, toEl.y + toEl.height - 12);
  if (yMax <= yMin) return (yMin + yMax) / 2;
  const n = Math.max(pp.length, 1);
  const gap = n <= 1 ? 0 : Math.min(32, Math.max(16, (yMax - yMin) / n));
  return Math.min(yMin + idx * gap, yMax);
}

/**
 * Point where a ray from the element center toward (targetX, targetY)
 * first meets the element border (rectangle, circle, ellipse, or participant lifeline strip).
 */
export function borderToward(el, targetX, targetY) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  let dx = targetX - cx;
  let dy = targetY - cy;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  if (el.type === 'circle') {
    const r = Math.min(el.width, el.height) / 2;
    return { x: cx + dx * r, y: cy + dy * r };
  }

  if (el.type === 'ellipse') {
    const rx = el.width / 2;
    const ry = el.height / 2;
    const denom = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) || 1;
    const t = 1 / denom;
    return { x: cx + dx * t * rx, y: cy + dy * t * ry };
  }

  /** Participant: prefer lifeline strip when connecting horizontally-ish (UML sequence). */
  if (el.type === 'participant') {
    const lx = el.x + el.width / 2;
    const topBody = el.y + PARTICIPANT_HEADER_PX;
    const horiz = Math.abs(dy) < Math.abs(dx) * 0.35;
    if (horiz && targetY >= topBody - 4) {
      const yLine = Math.min(Math.max(targetY, topBody), el.y + el.height - 2);
      const sign = dx >= 0 ? 1 : -1;
      const hw = el.width / 2;
      return { x: lx + sign * hw, y: yLine };
    }
    const rectHw = el.width / 2;
    const rectHh = el.height / 2;
    let tRect = Infinity;
    if (Math.abs(dx) > 1e-9) tRect = Math.min(tRect, rectHw / Math.abs(dx));
    if (Math.abs(dy) > 1e-9) tRect = Math.min(tRect, rectHh / Math.abs(dy));
    if (!isFinite(tRect) || tRect === Infinity) tRect = Math.max(rectHw, rectHh);
    return { x: cx + dx * tRect, y: cy + dy * tRect };
  }

  const hw = el.width / 2;
  const hh = el.height / 2;
  let t = Infinity;
  if (Math.abs(dx) > 1e-9) t = Math.min(t, hw / Math.abs(dx));
  if (Math.abs(dy) > 1e-9) t = Math.min(t, hh / Math.abs(dy));
  if (!isFinite(t) || t === Infinity) t = Math.max(hw, hh);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Endpoints on shape borders, with perpendicular offset for parallel bundles.
 */
export function connectorEndpoints(fromEl, toEl, connectors, conn) {
  const fc = getCenter(fromEl);
  const tc = getCenter(toEl);
  const vx = tc.x - fc.x;
  const vy = tc.y - fc.y;
  const vlen = Math.hypot(vx, vy) || 1;
  const px = -vy / vlen;
  const py = vx / vlen;
  const off = bundleOffsetPx(connectors, conn);
  const ox = px * off;
  const oy = py * off;

  const b1 = borderToward(fromEl, tc.x + ox, tc.y + oy);
  const b2 = borderToward(toEl, fc.x + ox, fc.y + oy);
  return { x1: b1.x, y1: b1.y, x2: b2.x, y2: b2.y };
}

/**
 * Template-aware endpoints: UML Sequence participant↔participant = horizontal message between lifelines.
 */
export function connectorEndpointsSmart(fromEl, toEl, connectors, conn, elements, template) {
  if (
    isSequenceTemplate(template) &&
    fromEl?.type === 'participant' &&
    toEl?.type === 'participant'
  ) {
    const y = sequenceMessageY(fromEl, toEl, elements, connectors, conn);
    const x1 = fromEl.x + fromEl.width / 2;
    const x2 = toEl.x + toEl.width / 2;
    return { x1, y1: y, x2, y2: y };
  }
  return connectorEndpoints(fromEl, toEl, connectors, conn);
}

/** Offsets among connectors that are true self-loops on the same node. */
function selfLoopBundleOffset(connectors, conn, spacing = 20) {
  const bundle = connectors
    .filter((o) => o.fromElement === conn.fromElement && o.toElement === conn.toElement)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const idx = bundle.findIndex((o) => o.id === conn.id);
  const n = bundle.length;
  return (idx - (n - 1) / 2) * spacing;
}

/** Self-loop: anchor on top edge, curve bulges upward; offset shifts sideways for multiple loops. */
export function selfLoopPath(fromEl, connectors, conn) {
  const cx = fromEl.x + fromEl.width / 2;
  const topY = fromEl.type === 'participant' ? fromEl.y : fromEl.y;
  const off = selfLoopBundleOffset(connectors, conn);
  const bulge = 70 + Math.abs(off) * 0.12;
  const x = cx + off * 0.4;
  const y = topY;
  const path = `M ${x} ${y} C ${x - 50 - Math.abs(off) * 0.25} ${y - bulge}, ${x + 50 + Math.abs(off) * 0.25} ${y - bulge}, ${x} ${y}`;
  return { path, labelX: x, labelY: y - bulge * 0.55 };
}
