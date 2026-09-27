// Single source of truth for chart styling — warm Andean palette on light paper.
// Both the xy charts (chartLogic) and the choropleth maps (MapChart) read from
// here so the whole app is one design system.

export const PALETTE = [
  '#c85a34', // terracotta
  '#157a6e', // teal
  '#d99a2b', // ochre
  '#8a4a6b', // plum
  '#6f8f4e', // sage
  '#3f5aa6', // indigo
  '#e0895f', // coral
  '#a23b34', // brick
  '#4c7a86', // slate teal
  '#9c6b2f', // bronze
]

// warm sequential ramp for choropleths (low -> high). The lightest stop is kept
// clearly darker than the cream panel so low-value areas don't blend in.
export const SEQ = {
  light: ['#efdcb4', '#e8c185', '#dd9c56', '#cd7433', '#b4501f', '#7f2f14'],
  dark: ['#efdcb4', '#e8c185', '#dd9c56', '#cd7433', '#b4501f', '#7f2f14'],
}

export function tokens() {
  return {
    text: '#34291c', axis: '#6f6350', grid: '#ece1cd',
    tooltipBg: '#fffdf7', tooltipBorder: '#e7dcc6',
    mapBorder: '#fdf6e8', mapEmpty: '#cdbb93', mapLabel: '#34291c',
  }
}

export function tooltip(trigger = 'axis') {
  const t = tokens()
  return {
    trigger,
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: [9, 13],
    textStyle: { color: t.text, fontSize: 12.5, fontWeight: 500 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(200,90,52,.06)' } },
    extraCssText: 'box-shadow:0 8px 26px -8px rgba(80,50,20,.28);border-radius:11px;',
  }
}

export const FONT =
  '"Hanken Grotesk Variable", "Hanken Grotesk", system-ui, sans-serif'
