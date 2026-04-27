/**
 * Edge-to-edge connector geometry so arrow markers sit on visible lines,
 * plus parallel offsets when multiple links share the same node pair (e.g. A→B and B→A).
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

/**
 * Point where a ray from the element center toward (targetX, targetY)
 * first meets the element border (rectangle or circle).
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
  const topY = fromEl.y;
  const off = selfLoopBundleOffset(connectors, conn);
  const bulge = 70 + Math.abs(off) * 0.12;
  const x = cx + off * 0.4;
  const y = topY;
  const path = `M ${x} ${y} C ${x - 50 - Math.abs(off) * 0.25} ${y - bulge}, ${x + 50 + Math.abs(off) * 0.25} ${y - bulge}, ${x} ${y}`;
  return { path, labelX: x, labelY: y - bulge * 0.55 };
}
