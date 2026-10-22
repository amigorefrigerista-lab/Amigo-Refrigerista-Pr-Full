// lib/ptData.ts
export type RefrigerantCode = 'R410A' | 'R32' | 'R22' | 'R134a' | 'R404A' | 'R290';

export interface RefrigerantInfo {
  code: RefrigerantCode;
  name: string;
  colorHex: string;
  oilType: string;
  typicalApplication: string;
  targetSuperheatRange: [number, number];
  targetSubcoolingRange: [number, number];
  ptCurve: [number, number][];
}

export const REFRIGERANT_DATABASE: Record<RefrigerantCode, RefrigerantInfo> = {
  R410A: {
    code: 'R410A',
    name: 'R-410A (Puron)',
    colorHex: '#ec4899',
    oilType: 'POE (Poliol Ester)',
    typicalApplication: 'Splits Inverter e Convencionais',
    targetSuperheatRange: [4, 8],
    targetSubcoolingRange: [5, 9],
    ptCurve: [
      [-30, 25.4], [-25, 35.5], [-20, 47.4], [-15, 61.2], [-10, 77.1],
      [-5, 95.3], [0, 116.0], [2, 125.1], [4, 134.6], [5, 139.6],
      [6, 144.6], [8, 155.1], [10, 166.1], [12, 177.6], [15, 195.8],
      [20, 229.3], [25, 266.8], [30, 308.6], [35, 354.9], [40, 406.1],
      [45, 462.5], [50, 524.3], [55, 592.0], [60, 666.0], [65, 746.8]
    ],
  },
  R32: {
    code: 'R32',
    name: 'R-32 (Inverter A2L)',
    colorHex: '#06b6d4',
    oilType: 'POE / FVC',
    typicalApplication: 'Splits Inverter Modernos',
    targetSuperheatRange: [4, 8],
    targetSubcoolingRange: [5, 8],
    ptCurve: [
      [-30, 26.2], [-25, 36.6], [-20, 48.8], [-15, 63.0], [-10, 79.4],
      [-5, 98.2], [0, 119.6], [2, 129.0], [4, 138.9], [5, 144.0],
      [6, 149.3], [8, 160.2], [10, 171.6], [12, 183.5], [15, 202.4],
      [20, 237.2], [25, 276.2], [30, 319.8], [35, 368.1], [40, 421.6],
      [45, 480.6], [50, 545.5], [55, 616.7], [60, 694.6], [65, 779.8]
    ],
  },
  R22: {
    code: 'R22',
    name: 'R-22 (HCFC-22)',
    colorHex: '#22c55e',
    oilType: 'Mineral / Alquilbenzeno',
    typicalApplication: 'Splits Antigos, ACJ e Comercial',
    targetSuperheatRange: [5, 9],
    targetSubcoolingRange: [5, 9],
    ptCurve: [
      [-30, 8.9], [-25, 14.8], [-20, 21.8], [-15, 30.0], [-10, 39.6],
      [-5, 50.6], [0, 63.2], [2, 68.8], [4, 74.6], [5, 77.7],
      [6, 80.8], [8, 87.3], [10, 94.1], [12, 101.3], [15, 112.7],
      [20, 133.6], [25, 157.2], [30, 183.5], [35, 212.9], [40, 245.4],
      [45, 281.3], [50, 320.7], [55, 363.9], [60, 411.1], [65, 462.5]
    ],
  },
  R134a: {
    code: 'R134a',
    name: 'R-134a (HFC-134a)',
    colorHex: '#38bdf8',
    oilType: 'POE (Poliol Ester)',
    typicalApplication: 'Bebedouros, Geladeiras e Balcoes',
    targetSuperheatRange: [4, 8],
    targetSubcoolingRange: [4, 7],
    ptCurve: [
      [-30, -2.9], [-25, 0.9], [-20, 5.5], [-15, 11.1], [-10, 17.7],
      [-5, 25.4], [0, 34.5], [2, 38.5], [4, 42.8], [5, 45.0],
      [6, 47.3], [8, 52.1], [10, 57.2], [12, 62.6], [15, 71.2],
      [20, 87.3], [25, 105.6], [30, 126.4], [35, 149.8], [40, 176.1],
      [45, 205.4], [50, 238.1], [55, 274.3], [60, 314.3], [65, 358.4]
    ],
  },
  R404A: {
    code: 'R404A',
    name: 'R-404A (Comercial / Camaras)',
    colorHex: '#f97316',
    oilType: 'POE (Poliol Ester)',
    typicalApplication: 'Camaras Frigorificas e Freezers',
    targetSuperheatRange: [4, 7],
    targetSubcoolingRange: [4, 8],
    ptCurve: [
      [-30, 15.2], [-25, 22.8], [-20, 31.8], [-15, 42.2], [-10, 54.3],
      [-5, 68.1], [0, 83.9], [2, 90.8], [4, 98.1], [5, 101.9],
      [6, 105.8], [8, 113.8], [10, 122.3], [12, 131.1], [15, 145.2],
      [20, 171.0], [25, 199.9], [30, 232.1], [35, 267.9], [40, 307.4],
      [45, 351.0], [50, 398.9], [55, 451.4], [60, 508.9], [65, 571.8]
    ],
  },
  R290: {
    code: 'R290',
    name: 'R-290 (Propano - A3 Inflamavel)',
    colorHex: '#ef4444',
    oilType: 'POE / Mineral',
    typicalApplication: 'Bebedouros e Expositores Modernos',
    targetSuperheatRange: [4, 8],
    targetSubcoolingRange: [4, 7],
    ptCurve: [
      [-30, 9.6], [-25, 15.3], [-20, 22.1], [-15, 30.0], [-10, 39.2],
      [-5, 49.8], [0, 61.9], [2, 67.2], [4, 72.8], [5, 75.7],
      [6, 78.7], [8, 84.9], [10, 91.4], [12, 98.2], [15, 109.0],
      [20, 128.8], [25, 151.0], [30, 175.8], [35, 203.3], [40, 233.7],
      [45, 267.1], [50, 303.8], [55, 343.9], [60, 387.6], [65, 435.1]
    ],
  },
};

export function getSaturationTempFromPsi(refrigerant: RefrigerantCode, psi: number): number {
  const curve = REFRIGERANT_DATABASE[refrigerant]?.ptCurve;
  if (!curve || curve.length === 0) return 0;
  if (psi <= curve[0][1]) return curve[0][0];
  if (psi >= curve[curve.length - 1][1]) return curve[curve.length - 1][0];

  for (let i = 0; i < curve.length - 1; i++) {
    const [t1, p1] = curve[i];
    const [t2, p2] = curve[i + 1];
    if (psi >= p1 && psi <= p2) {
      const ratio = (psi - p1) / (p2 - p1);
      return Number((t1 + ratio * (t2 - t1)).toFixed(1));
    }
  }
  return 0;
}

export function getPsiFromSaturationTemp(refrigerant: RefrigerantCode, tempC: number): number {
  const curve = REFRIGERANT_DATABASE[refrigerant]?.ptCurve;
  if (!curve || curve.length === 0) return 0;
  if (tempC <= curve[0][0]) return curve[0][1];
  if (tempC >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

  for (let i = 0; i < curve.length - 1; i++) {
    const [t1, p1] = curve[i];
    const [t2, p2] = curve[i + 1];
    if (tempC >= t1 && tempC <= t2) {
      const ratio = (tempC - t1) / (t2 - t1);
      return Number((p1 + ratio * (p2 - p1)).toFixed(1));
    }
  }
  return 0;
}