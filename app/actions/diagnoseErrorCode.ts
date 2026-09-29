'use server';

import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface DiagnosisResult {
  code: string;
  brand: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  probableCauses: string[];
  stepByStepSolution: string[];
  requiredTools: string[];
  safetyPrecautions: string[];
  testProcedures: string[];
}

// Base de dados offline para fallback em caso de limite de quota da API
const KNOWN_FALLBACKS: Record<string, DiagnosisResult> = {
  'E1': {
    code: 'E1',
    brand: 'Universal',
    category: 'Sensor',
    severity: 'medium',
    title: 'Falha no Sensor de Temperatura Ambiente da Evaporadora',
    description: 'Circuito aberto ou curto-circuito detectado na sonda termistora (sensor de temperatura ambiente de retorno).',
    probableCauses: [
      'Sensor descalibrado, desconectado ou rompido',
      'Mau contato no conector da placa PCB principal',
      'Defeito no circuito comparador ADC da placa eletrônica'
    ],
    stepByStepSolution: [
      'Desligue a alimentação elétrica geral do disjuntor',
      'Retire a carenagem da evaporadora e localize o sensor termistor',
      'Desconecte o sensor e meça sua resistência ôhmica em 25°C (geralmente 5kΩ, 10kΩ ou 15kΩ)',
      'Substitua o sensor termistor caso apresente valor infinito (aberto) ou 0Ω (curto)'
    ],
    requiredTools: ['Multímetro com ponta de prova fina', 'Termômetro de contato', 'Chave Phillips'],
    safetyPrecautions: ['Desligar a rede elétrica antes de abrir a placa'],
    testProcedures: ['Tabela ôhmica kΩ vs Temperatura da marca']
  },
  'CH05': {
    code: 'CH05',
    brand: 'LG',
    category: 'Comunicação',
    severity: 'high',
    title: 'Falha de Comunicação Serial (Evaporadora x Condensadora)',
    description: 'A unidade interna não recebe sinal de sincronismo e dados da unidade externa através do cabo de comunicação (Borne 3 / Sinal).',
    probableCauses: [
      'Cabo de sinal (borne 3) rompido, com emenda oxidada ou invertido',
      'Falta de aterramento adequado gerando ruído eletromagnético',
      'Placa eletrônica da condensadora sem alimentação ou com fusível aberto'
    ],
    stepByStepSolution: [
      'Verifique se os LEDs da placa externa da condensadora estão acesos',
      'Meça a tensão DC entre os bornes 2 (Neutro) e 3 (Sinal) - deve oscilar constantemente entre 0V e 75V DC',
      'Inspecione continuidade de todo o cabo PP de interligação e aterramento',
      'Substitua a placa externa caso os pulsos de comunicação estejam ausentes'
    ],
    requiredTools: ['Multímetro True-RMS DC/AC', 'Chave Phillips', 'Alicate decapador'],
    safetyPrecautions: ['Aguardar 5 minutos para descarga dos capacitores DC Link'],
    testProcedures: ['Medição de tensão oscilante de comunicação serial']
  }
};

export async function diagnoseErrorCode(brand: string, code: string, equipmentType?: string): Promise<DiagnosisResult> {
  if (!code || !brand) {
    throw new Error('Marca e código de erro são obrigatórios.');
  }

  const prompt = `Você é um engenheiro sênior especialista em diagnóstico de ar-condicionado (HVAC-R).
Forneça uma análise técnica aprofundada para o seguinte código de erro:
Marca: ${brand}
Código: ${code}
Tipo de Equipamento: ${equipmentType || 'Split / Inverter / VRF'}

Retorne EXCLUSIVAMENTE um JSON puro válido com a seguinte estrutura:
{
  "code": "${code.toUpperCase()}",
  "brand": "${brand}",
  "category": "Sensor | Comunicação | Compressor | Inversor | Ventilador | Pressão | Outro",
  "severity": "low | medium | high | critical",
  "title": "Título claro do defeito",
  "description": "Explicação técnica detalhada do que ocorreu",
  "probableCauses": ["Causa 1", "Causa 2", "Causa 3"],
  "stepByStepSolution": ["Passo 1", "Passo 2", "Passo 3", "Passo 4"],
  "requiredTools": ["Multímetro", "Manifold", "Termômetro", "Chaves"],
  "safetyPrecautions": ["Desligar disjuntor geral", "Aguardar descarga de capacitores"],
  "testProcedures": ["Medição de resistência ôhmica dos sensores", "Teste de tensão DC/AC"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    return JSON.parse(text) as DiagnosisResult;
  } catch (err: any) {
    console.warn('Erro na IA do Gemini ao diagnosticar (ativando base técnica de emergência):', err?.message);
    const upperCode = code.toUpperCase().trim();
    if (KNOWN_FALLBACKS[upperCode]) {
      return KNOWN_FALLBACKS[upperCode];
    }
    
    return {
      code: upperCode,
      brand,
      category: 'Diagnóstico Geral',
      severity: 'medium',
      title: `Código ${upperCode} identificado na linha ${brand}`,
      description: `Código registrado para equipamentos da marca ${brand}. Recomenda-se checagem dos sensores térmicos, tensão de alimentação e interligação elétrica.`,
      probableCauses: [
        'Variação ou oscilação na tensão de alimentação elétrica',
        'Leitura fora do padrão em sensor termistor ou transdutor de pressão',
        'Falha de sincronismo entre as placas de controle'
      ],
      stepByStepSolution: [
        'Desligue o disjuntor de alimentação por 3 minutos e religue para resetar a memória da PCB',
        'Meça a tensão de entrada nos bornes L e N (220V ± 10%)',
        'Inspecione os sensores de temperatura de serpentina e descarga com multímetro na escala de kΩ',
        'Consulte o esquema elétrico presente na tampa da máquina para validação final'
      ],
      requiredTools: ['Multímetro', 'Termômetro', 'Chave Phillips'],
      safetyPrecautions: ['Trabalhe com a máquina desenergizada'],
      testProcedures: ['Medição de tensão e resistência ôhmica']
    };
  }
}
