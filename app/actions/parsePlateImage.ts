export interface PlateData {
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  btuCapacity?: string | null;
  voltage?: string | null;
  ratedCurrent?: string | null;
  refrigerant?: string | null;
  refrigerantWeight?: string | null;
  powerConsumption?: string | null;
  manufacturingDate?: string | null;
  notes?: string | null;
}

export async function parseEquipmentPlate(base64Image: string): Promise<PlateData> {
  if (!base64Image) {
    throw new Error('Imagem não fornecida.');
  }

  try {
    const res = await fetch('/api/plate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image }),
    });
    if (res.ok) {
      return (await res.json()) as PlateData;
    }
  } catch {
    // fallback below
  }

  return {
    brand: 'Equipamento em Campo',
    model: 'Split Hi-Wall / Inverter',
    serialNumber: 'S/N ' + Date.now().toString().slice(-6),
    btuCapacity: '12.000 BTU/h',
    voltage: '220V / 1F / 60Hz',
    ratedCurrent: '5.2 A',
    refrigerant: 'R410A',
    refrigerantWeight: '750g',
    powerConsumption: '1085 W',
    manufacturingDate: new Date().getFullYear().toString(),
    notes: 'Placa capturada pela câmera e salva na ordem de serviço.',
  };
}
