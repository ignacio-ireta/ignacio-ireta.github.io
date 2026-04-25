const DARK_STROKES = {
  rose: "#f0a7b4",
  blue: "#a7bce8",
  teal: "#9ed1ca",
  gold: "#e5c083",
  violet: "#c1b4e5"
};

const LIGHT_STROKES = {
  rose: "#7c1f2a",
  blue: "#173f69",
  teal: "#17615d",
  gold: "#6b511f",
  violet: "#4f4774"
};

function cssVar(root, name) {
  return getComputedStyle(root).getPropertyValue(name).trim();
}

export function readPalette(root, isDark) {
  const strokes = isDark ? DARK_STROKES : LIGHT_STROKES;

  return {
    rose: { fill: cssVar(root, "--accent-rose"), stroke: strokes.rose },
    blue: { fill: cssVar(root, "--accent-blue"), stroke: strokes.blue },
    teal: { fill: cssVar(root, "--accent-teal"), stroke: strokes.teal },
    gold: { fill: cssVar(root, "--accent-gold"), stroke: strokes.gold },
    violet: { fill: cssVar(root, "--accent-violet"), stroke: strokes.violet },
    ink: cssVar(root, "--ink"),
    line: cssVar(root, "--line-strong"),
    paper: cssVar(root, "--bg"),
    deep: cssVar(root, "--bg-deep")
  };
}
