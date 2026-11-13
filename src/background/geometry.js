// Points of a close-packed (hexagonal) lattice within `radius` of the origin:
// rows `spacing * sqrt(3) / 2` apart, alternate rows offset by half a spacing.
export function hexLatticePoints(radius, spacing) {
  const points = [];
  const rowHeight = (spacing * Math.sqrt(3)) / 2;
  const rows = Math.floor(radius / rowHeight);
  for (let row = -rows; row <= rows; row += 1) {
    const y = row * rowHeight;
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    const columns = Math.floor((radius + spacing) / spacing);
    for (let column = -columns; column <= columns; column += 1) {
      const x = column * spacing + offset;
      if (x * x + y * y <= radius * radius) points.push({ x, y });
    }
  }
  return points;
}
