'use server';

import { GoogleGenAI } from '@google/genai';

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

function normalizeBrand(brand: string): string {
  const b = (brand || '').toLowerCase().trim();
  if (b.includes('daikin')) return 'daikin';
  if (b.includes('lg')) return 'lg';
  if (b.includes('midea') || b.includes('springer')) return 'midea';
  if (b.includes('gree')) return 'gree';
  if (b.includes('samsung')) return 'samsung';
  if (b.includes('carrier')) return 'carrier';
  if (b.includes('fujitsu')) return 'fujitsu';
  if (b.includes('elgin')) return 'elgin';
  if (b.includes('tcl')) return 'tcl';
  if (b.includes('philco') || b.includes('britania') || b.includes('britânia')) return 'philco';
  if (b.includes('consul')) return 'consul';
  if (b.includes('york')) return 'york';
  if (b.includes('hitachi')) return 'hitachi';
  if (b.includes('komeco')) return 'komeco';
  if (b.includes('panasonic')) return 'panasonic';
  if (b.includes('electrolux')) return 'electrolux';
  return 'general';
}

/**
 * Validador estrito dos campos obrigatórios do diagnóstico (título, causas prováveis e solução passo a passo)
 */
function isValidDiagnosis(res: any): boolean {
  if (!res || typeof res !== 'object') return false;

  const hasValidTitle = typeof res.title === 'string' && res.title.trim().length >= 3;
  const hasValidCauses =
    Array.isArray(res.probableCauses) &&
    res.probableCauses.length > 0 &&
    res.probableCauses.some((c: any) => typeof c === 'string' && c.trim().length > 0);
  const hasValidSolution =
    Array.isArray(res.stepByStepSolution) &&
    res.stepByStepSolution.length > 0 &&
    res.stepByStepSolution.some((s: any) => typeof s === 'string' && s.trim().length > 0);

  return Boolean(hasValidTitle && hasValidCauses && hasValidSolution);
}

// -------------------------------------------------------------
// BANCO DE DEFEITOS CLÍNICOS E SINTOMAS TERMODINÂMICOS / MECÂNICOS
// -------------------------------------------------------------
interface SymptomDefinition {
  keywords: string[];
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

const SYMPTOM_DATABASE: SymptomDefinition[] = [
  // 1. NÃO GELA / BAIXO RENDIMENTO
  {
    keywords: ['nao gela', 'não gela', 'nao gela nada', 'nao resfria', 'não resfria', 'pouco rendimento', 'ar quente', 'soprando morno', 'sem rendimento', 'fraco'],
    category: 'Rendimento / Ciclo Frigorígeno',
    severity: 'high',
    title: 'Defeito: Ar Condicionado Liga mas Não Gela / Baixo Rendimento Frigorífico',
    description: 'O equipamento opera os ventiladores mas a troca térmica é insuficiente ou inexistente, resultando em insuflamento sem refrigeração.',
    probableCauses: [
      'Carga de fluido refrigerante insuficiente por microvazamento nas porcas flange',
      'Serpentinas evaporadora ou condensadora com acúmulo severo de poeira e gordura bloqueando troca térmica',
      'Compressor desarmando por proteção térmica ou operando em rotação mínima travada por erro de sensor',
      'Capacitor do compressor esgotado (em máquinas convencionais On/Off) ou válvula reversora vazando internamente'
    ],
    stepByStepSolution: [
      'Conecte o manifold digital na válvula de serviço e meça a pressão de sucção (R410A: ~110-135 PSI; R32: ~115-140 PSI; R22: ~60-70 PSI)',
      'Calcule o Superaquecimento Útil (deve estar entre 4K e 7K / 7°F e 13°F)',
      'Meça o diferencial de temperatura (ΔT) entre o retorno e insuflamento da evaporadora (o valor normal é de 8°C a 14°C)',
      'Inspecione a limpeza da serpentina externa (condensadora) e filtros internos',
      'Verifique com alicate amperímetro se a corrente consumida está próxima da nominal'
    ],
    requiredTools: ['Manifold Digital com Termopares', 'Alicate Amperímetro True-RMS', 'Termômetro Laser / Espeto', 'Detector de Vazamento'],
    safetyPrecautions: ['Não tocar na tubulação de descarga que pode ultrapassar 90°C'],
    testProcedures: ['Cálculo de Superaquecimento Útil (SH) e Sub-resfriamento (SC), medição de ΔT do ar']
  },

  // 2. CONGELANDO TUBO FINO (EXPANSÃO / LINHA DE LÍQUIDO)
  {
    keywords: ['congelando tubo fino', 'gelo no tubo fino', 'congelando linha de liquido', 'congelando expansao', 'tubo fino com gelo', 'congelando descarga'],
    category: 'Fluido Refrigerante / Expansão',
    severity: 'high',
    title: 'Defeito: Linha de Líquido (Tubo Fino) Criando Gelo',
    description: 'A formação de gelo a partir da conexão de saída da condensadora indica expansão precoce por falta severa de fluido refrigerante ou restrição parcial na filtragem.',
    probableCauses: [
      'Subcarga severa de fluido refrigerante (vazamento no sistema)',
      'Válvula de expansão eletrônica (EEV) ou tubo capilar parcialmente entupido',
      'Válvula de serviço de 1/4" esquecida semiaberta ou obstruída'
    ],
    stepByStepSolution: [
      'Instale o manifold na linha de baixa e observe a pressão de evaporação (estará anormalmente baixa, abaixo de 80 PSI no R410A)',
      'Meça o Superaquecimento Útil: um valor extremamente alto (>15K) confirma falta de fluido',
      'Desligue o aparelho, aplique pressurização de nitrogênio a 400 PSI e localize o vazamento com espuma ou detector',
      'Refaça as flanges com flangeador excêntrico e torque adequado, faça vácuo (<500 microns) e recarregue a quantidade exata por peso na balança'
    ],
    requiredTools: ['Manifold Digital', 'Balança de Carga Frigorífica', 'Vacuômetro Digital', 'Bomba de Vácuo', 'Flangeador Excêntrico'],
    safetyPrecautions: ['Nunca complete carga de R410A com vazamento sem recolher e fazer carga nova por balança'],
    testProcedures: ['Teste de Superaquecimento Útil e teste de estanqueidade com Nitrogênio a 400 PSI']
  },

  // 3. CONGELANDO TUBO GROSSO / EVAPORADORA (SUCÇÃO)
  {
    keywords: ['congelando tubo grosso', 'gelo no tubo grosso', 'congelando succao', 'congelando succao', 'congelando evaporadora', 'gelo na serpentina interna', 'bloco de gelo'],
    category: 'Fluxo de Ar / Evaporação',
    severity: 'high',
    title: 'Defeito: Linha de Sucção (Tubo Grosso) ou Evaporadora Criando Bloco de Gelo',
    description: 'A formação de gelo na serpentina interna e no tubo grosso indica falta de fluxo de ar para evaporar o fluido ou retorno de líquido ao compressor.',
    probableCauses: [
      'Filtros de ar da evaporadora totalmente obstruídos por sujeira',
      'Turbina da evaporadora impregnada de poeira/mofo ou girando em baixa rotação (falha no motor/capacitor)',
      'Excesso de carga de fluido refrigerante (sobrecarga)',
      'Sensor de serpentina (anticongelamento) descalibrado não desarmando a máquina'
    ],
    stepByStepSolution: [
      'Desligue o modo frio e coloque em ventilação para derreter o gelo com segurança',
      'Higienize profundamente os filtros, turbina e serpentina evaporadora',
      'Verifique se a turbina gira na velocidade máxima e meça o capacitor/motor BLDC',
      'Monitore o Superaquecimento com manifold: se estiver muito baixo (<3K), indica sobrecarga de gás ou falta de troca térmica'
    ],
    requiredTools: ['Kit de Higienização com Bolsa Coletora', 'Manifold Digital', 'Multímetro', 'Anemômetro'],
    safetyPrecautions: ['Proteger a placa eletrônica da evaporadora contra respingos de água durante o descongelamento'],
    testProcedures: ['Medição de vazão de ar da turbina e cálculo de Superaquecimento']
  },

  // 4. COMPRESSOR NÃO LIGA / NÃO PARTE
  {
    keywords: ['compressor nao liga', 'compressor não liga', 'compressor nao parte', 'compressor não parte', 'compressor parado', 'nao liga compressor', 'compressor zumbindo', 'compressor trava'],
    category: 'Compressor / Elétrica',
    severity: 'critical',
    title: 'Defeito: Compressor Não Parte / Não Entra em Funcionamento',
    description: 'A unidade interna liga os comandos, mas o compressor na unidade externa não inicia a compressão ou emite zumbido e desarma.',
    probableCauses: [
      'Em máquinas Inverter: Módulo IPM danificado na placa externa ou compressor com enrolamentos rompidos',
      'Em máquinas Convencionais (On/Off): Capacitor de partida/marcha do compressor esgotado ou aberto',
      'Sensor de descarga da condensadora com leitura aberta (>500kΩ) bloqueando a partida por segurança',
      'Falta de alimentação elétrica (220V) chegando aos bornes do compressor ou relé da placa travado aberto'
    ],
    stepByStepSolution: [
      'Em Inverter: Meça a resistência ôhmica entre os três bornes U-V-W do compressor (deve ser perfeitamente equilibrada e sem fuga para terra)',
      'Em Inverter: Teste o módulo IPM da placa externa na escala de diodos do multímetro',
      'Em Convencional: Meça a capacitância com capacímetro (substitua se estiver >5% abaixo da nominal)',
      'Meça a tensão de comando de 220V que sai da placa interna para acionar a condensadora'
    ],
    requiredTools: ['Multímetro True-RMS', 'Capacímetro Digital', 'Megômetro', 'Alicate Amperímetro'],
    safetyPrecautions: ['Descarregar capacitores eletrolíticos e de marcha antes de tocar nos bornes'],
    testProcedures: ['Medição de resistência de enrolamentos U-V-W e teste de ponte inversora IPM']
  },

  // 5. COMPRESSOR ESQUENTA E DESLIGA / DESARME TÉRMICO
  {
    keywords: ['compressor esquenta e desliga', 'compressor esquenta', 'desarmando por termico', 'desarme termico', 'compressor desliga depois de um tempo', 'compressor desarma', 'protetor termico atuando'],
    category: 'Proteção Térmica / Compressor',
    severity: 'critical',
    title: 'Defeito: Compressor Superaquecendo e Desarmando por Protetor Térmico (Klixon)',
    description: 'O compressor entra em funcionamento normalmente, mas após alguns minutos sua carcaça atinge temperatura excessiva (>105°C), atuando o protetor térmico interno/externo.',
    probableCauses: [
      'Serpentina da condensadora suja ou ventilador externo com rotação fraca aumentando a pressão e temperatura de descarga',
      'Falta de fluido refrigerante (o gás de sucção frio é responsável por resfriar o motor do compressor)',
      'Subtensão na rede elétrica (abaixo de 198V) fazendo a corrente elétrica subir consideravelmente',
      'Óleo lubrificante degradado ou atrito mecânico excessivo nos pistões/scroll'
    ],
    stepByStepSolution: [
      'Aguarde o compressor esfriar completamente para que o protetor térmico reabasteça o circuito fechado',
      'Lave a serpentina da unidade condensadora com produto desincrustante neutro',
      'Meça a tensão de alimentação com o compressor em funcionamento (não pode cair abaixo de 200V)',
      'Meça a corrente de operação com o alicate amperímetro e compare com a corrente nominal da placa',
      'Monitore o superaquecimento total no manifold'
    ],
    requiredTools: ['Alicate Amperímetro True-RMS', 'Manifold Digital', 'Termômetro Laser / Infravermelho', 'Lava-Jato Baixa Pressão'],
    safetyPrecautions: ['Nunca jogue água fria diretamente na carcaça do compressor quente (risco de trinca no bloco)'],
    testProcedures: ['Monitoramento de corrente contínua em carga e medição de temperatura de carcaça']
  },

  // 6. PINGANDO ÁGUA / VAZANDO ÁGUA NA EVAPORADORA
  {
    keywords: ['pingando agua', 'pingando água', 'vazando agua', 'vazando água', 'agua escorrendo', 'água escorrendo', 'gotejando', 'bandeja transbordando', 'dreno entupido'],
    category: 'Drenagem e Condensado',
    severity: 'medium',
    title: 'Defeito: Evaporadora Pingando / Vazando Água no Ambiente Interno',
    description: 'O condensado produzido na serpentina evaporadora não é escoado corretamente pela mangueira de dreno e transborda pela carenagem.',
    probableCauses: [
      'Mangueira ou tubulação de dreno obstruída por lodo, poeira, gosma bacteriana ou insetos',
      'Caimento/desnível negativo na instalação da unidade evaporadora ou na tubulação de dreno',
      'Falta de isolamento térmico na tubulação de sucção provocando condensação no interior da calha',
      'Bandeja de condensado trincada ou bico de saída quebrado'
    ],
    stepByStepSolution: [
      'Retire a carenagem frontal e aplique água com bomba de pressão/pressurizador na calha do dreno para desobstruir',
      'Verifique com nível de bolha se a evaporadora possui nivelamento correto com leve queda para o lado do dreno',
      'Inspecione se os tubos de cobre e o bico do dreno estão 100% envelopados com esponjoso elastomérico',
      'Aplique pastilha bactericida ou sanitizante na bandeja de dreno'
    ],
    requiredTools: ['Bomba de Limpeza de Dreno / Pressurizador', 'Nível de Bolha', 'Fita PVC e Isolamento Elastomérico'],
    safetyPrecautions: ['Proteger tomadas e equipamentos eletrônicos posicionados abaixo da evaporadora'],
    testProcedures: ['Teste de vazão contínua despejando 1 litro de água na bandeja']
  },

  // 7. DESARMANDO DISJUNTOR GERAL
  {
    keywords: ['desarmando disjuntor', 'desarma disjuntor', 'disjuntor caindo', 'cai o disjuntor', 'curto circuito', 'desarma o dr', 'fuga de corrente', 'desarme eletrico'],
    category: 'Elétrica / Curto-Circuito',
    severity: 'critical',
    title: 'Defeito: Equipamento Desarmando Disjuntor ou Interruptor DR (Diferencial Residual)',
    description: 'Ao ligar o ar-condicionado ou no momento em que o compressor entra em operação, o disjuntor térmico ou o DR desarma instantaneamente.',
    probableCauses: [
      'Compressor com enrolamento queimado com fuga de corrente para a carcaça/massa (massa aterrada)',
      'Cabos de alimentação com isolamento derretido encostando na carcaça metálica da condensadora',
      'Módulo IPM da placa externa em curto-circuito pleno entre positivo/negativo do DC-Link',
      'Disjuntor subdimensionado ou com fadiga térmica'
    ],
    stepByStepSolution: [
      'Desligue o disjuntor geral imediatamente',
      'Com o multímetro na escala de continuidade/megômetro, meça o isolamento de cada borne do compressor para o aterramento (deve registrar infinito / >10 MΩ)',
      'Inspecione o chicote elétrico de força em busca de cabos prensados na lataria',
      'Desconecte o reator e o módulo IPM e verifique se há curto na ponte retificadora de entrada',
      'Confirme se a curva do disjuntor é adequada (recomendado Curva C para cargas indutivas)'
    ],
    requiredTools: ['Megômetro Digital', 'Multímetro True-RMS', 'Chaves Isoladas 1000V'],
    safetyPrecautions: ['NUNCA arme o disjuntor repetidas vezes sem antes localizar o curto (risco de incêndio e queima de placas)'],
    testProcedures: ['Teste de isolamento com Megômetro a 500V e teste de curto-circuito no barramento DC']
  },

  // 8. VENTILADOR / TURBINA PARADA
  {
    keywords: ['ventilador parado', 'turbina parada', 'ventilador nao gira', 'ventilador não gira', 'motor nao roda', 'motor não roda', 'ventilador condensadora parado', 'helice travada', 'hélice travada'],
    category: 'Ventilador / Mecânica',
    severity: 'high',
    title: 'Defeito: Motor do Ventilador / Turbina Não Gira',
    description: 'A hélice da condensadora ou a turbina da evaporadora permanece estática, impedindo o fluxo de ar necessário para a troca de calor.',
    probableCauses: [
      'Travamento mecânico por desgaste nos mancais/rolamentos ou bucha de borracha ressecada',
      'Capacitor permanente do motor do ventilador esgotado (em motores AC convencionais)',
      'Motor BLDC com sensor Hall queimado ou falha no circuito de acionamento eletrônico da placa',
      'Fiação do motor rompida ou conector solto'
    ],
    stepByStepSolution: [
      'Gire a hélice/turbina com a mão com o aparelho desligado para testar se há atrito ou peso no eixo',
      'Em motores AC: Meça o capacitor com capacímetro (valores típicos: 1.2µF a 3.5µF)',
      'Em motores BLDC: Meça as tensões no conector: Vdc (310V DC), Vcc (15V DC), Vsp (0-5V DC)',
      'Substitua o capacitor ou o motor do ventilador'
    ],
    requiredTools: ['Capacímetro Digital', 'Multímetro True-RMS', 'Chave Phillips'],
    safetyPrecautions: ['Aguardar parada mecânica e desenergizar o circuito'],
    testProcedures: ['Medição de capacitância em µF e teste de tensões de controle BLDC']
  },

  // 9. BARULHO EXCESSIVO / RUÍDO / VIBRAÇÃO
  {
    keywords: ['barulho', 'ruido', 'ruído', 'vibracao', 'vibração', 'barulho excessivo', 'estalo', 'chiado', 'vibra muito', 'barulho na condensadora'],
    category: 'Mecânica e Vibração',
    severity: 'medium',
    title: 'Defeito: Ruído Excessivo, Vibração ou Estalos Anormais',
    description: 'Emissão sonora acima dos padrões nominais originada na unidade evaporadora ou condensadora.',
    probableCauses: [
      'Coxins de borracha (calços) da condensadora ressecados, soltos ou ausentes',
      'Hélice do ventilador desbalanceada, trincada ou raspando na grade',
      'Tubulação de cobre encostando na carcaça metálica da condensadora gerando ressonância',
      'Compressor com folga mecânica interna nos mancais de compressão',
      'Evaporadora: Turbina com aletas quebradas gerando desbalanceamento e ruído tipo turbilhonamento'
    ],
    stepByStepSolution: [
      'Instale ou substitua os 4 calços de borracha (coxins) sob os pés da condensadora',
      'Abra a tampa da condensadora e certifique-se de que nenhum tubo de cobre está em contato direto com a chapa',
      'Inspecione se a turbina ou hélice possui palhetas quebradas',
      'Reaperte todos os parafusos da carcaça'
    ],
    requiredTools: ['Chave Phillips', 'Chave de Boca / Catraca', 'Kit de Coxins Anti-vibração'],
    safetyPrecautions: ['Não colocar a mão próxima à hélice em movimento'],
    testProcedures: ['Inspeção visual e balanceamento dinâmico da turbina']
  },

  // 10. PLACA NÃO LIGA / MORTO
  {
    keywords: ['placa nao liga', 'placa não liga', 'aparelho morto', 'nao da sinal de vida', 'não dá sinal de vida', 'led apagado', 'nao liga no controle', 'nao acende o display', 'não acende'],
    category: 'Fonte de Alimentação / Placa PCB',
    severity: 'critical',
    title: 'Defeito: Aparelho Totalmente Inoperante / Placa Eletrônica Não Liga',
    description: 'Nenhum sinal luminoso nos LEDs, display apagado e ausência de resposta ao controle remoto ou botão manual de emergência.',
    probableCauses: [
      'Falta de tensão da rede elétrica de 220V ou disjuntor desarmado',
      'Fusível de proteção de vidro da placa evaporadora aberto por pico de tensão',
      'Varistor de proteção estourado em decorrência de sobretensão ou raio',
      'Fonte chaveada da placa (CI TOP/TNY, diodos retificadores ou transformador chopper) danificada'
    ],
    stepByStepSolution: [
      'Meça com multímetro a tensão nos bornes de entrada L e N (deve marcar 220V AC ± 10%)',
      'Retire a placa evaporadora e teste a continuidade do fusível de 3.15A',
      'Inspecione se o varistor (disco azul/amarelo) está queimado/carbonizado',
      'Meça as tensões de saída da fonte chaveada na placa: 12V DC (relés) e 5V DC (microcontrolador)'
    ],
    requiredTools: ['Multímetro True-RMS', 'Ferro de Solda e Estanho', 'Chaves Isoladas'],
    safetyPrecautions: ['Desligar a alimentação geral antes de retirar a placa eletrônica'],
    testProcedures: ['Teste de continuidade de fusível, teste de varistor e medição de tensões 5V/12V na PCB']
  },

  // 11. CONTROLE REMOTO NÃO RESPONDE
  {
    keywords: ['controle nao funciona', 'controle não funciona', 'nao responde ao controle', 'não responde ao controle', 'receptor com defeito', 'placa do display'],
    category: 'Recepção / Controle Remoto',
    severity: 'low',
    title: 'Defeito: Evaporadora Não Responde aos Comandos do Controle Remoto',
    description: 'O controle remoto emite sinal, mas a evaporadora não emite bipe nem altera parâmetros.',
    probableCauses: [
      'Pilhas do controle fracas ou oxidação nos contatos de mola',
      'Fotodiodo receptor infravermelho (IR) da placa do display danificado ou com solda fria',
      'Cabo flat de interligação entre o display e a placa principal rompido ou solto'
    ],
    stepByStepSolution: [
      'Aponte o controle para a câmera do celular e aperte qualquer botão: se a luz infravermelha piscar na tela do celular, o controle está transmitindo',
      'Aperte o botão manual de emergência (botão Auto/Cool na evaporadora): se a máquina ligar, o defeito está restrito ao circuito receptor',
      'Inspecione o cabo flat e a plaquinha do display em busca de umidade ou oxidação',
      'Substitua o sensor receptor IR ou a placa do display'
    ],
    requiredTools: ['Smartphone (câmera)', 'Multímetro', 'Chave Phillips pequena'],
    safetyPrecautions: ['Cuidado ao manusear cabos flats delicados'],
    testProcedures: ['Teste de emissão infravermelha e teste do botão manual de emergência']
  },

  // 12. VÁLVULA REVERSORA NÃO ACIONA / NÃO AQUECE
  {
    keywords: ['nao esquenta', 'não esquenta', 'valvula reversora', 'válvula reversora', 'modo quente nao funciona', 'nao aciona quente', 'aquecimento fraco'],
    category: 'Válvula Reversora (4 Vias) / Ciclo Reverso',
    severity: 'high',
    title: 'Defeito: Modo Quente Inoperante / Válvula de 4 Vias Não Comuta',
    description: 'O ar-condicionado quente/frio resfria no verão, mas ao selecionar o modo de aquecimento no inverno sopra frio ou não comuta o ciclo.',
    probableCauses: [
      'Bobina da válvula reversora queimada ou sem alimentação de 220V vinda da placa',
      'Cursor mecânico interno da válvula de 4 vias travado mecanicamente',
      'Sensor de serpentina externa atuando degelo falso por descalibração'
    ],
    stepByStepSolution: [
      'Selecione o modo Aquecimento em 30°C e aguarde até 5 minutos (função Hot Start atrasa ventilação)',
      'Meça a tensão nos fios da bobina da válvula de 4 vias na condensadora (deve registrar 220V AC)',
      'Meça a resistência ôhmica da bobina solenoide (geralmente entre 1.5kΩ e 2.5kΩ)',
      'Se houver tensão e a bobina estiver boa, dê leves batidas com o cabo plástico de uma chave no corpo de latão da válvula para liberar o cursor travado'
    ],
    requiredTools: ['Multímetro True-RMS', 'Manifold', 'Chaves Isoladas'],
    safetyPrecautions: ['Tubulação no modo quente pode superar 85°C na linha de líquido'],
    testProcedures: ['Medição de tensão e resistência da bobina solenoide da válvula 4 vias']
  }
];

// Catálogo Oficial de Códigos de Erros Mapeados por Marca
const BRAND_CODE_DATABASE: Record<string, DiagnosisResult> = {
  // DAIKIN
  'daikin:U4': {
    code: 'U4',
    brand: 'Daikin',
    category: 'Comunicação',
    severity: 'high',
    title: 'Daikin: Falha de Transmissão entre Unidade Interna e Externa',
    description: 'Interrupção na linha de transmissão e dados entre a placa PCB de controle da evaporadora e a condensadora Daikin.',
    probableCauses: [
      'Cabo de sinal F1/F2 ou borne de interligação rompido ou com polaridade invertida',
      'Falta de aterramento adequado gerando ruído eletromagnético na linha de dados',
      'Fusível aberto ou falha na placa de comando da unidade externa'
    ],
    stepByStepSolution: [
      'Desligue o disjuntor geral e inspecione as conexões nos bornes F1-F2 / 1-2-3',
      'Meça a continuidade de cada via do cabo de sinal',
      'Ligue a máquina e meça a tensão DC oscilante entre as linhas de transmissão',
      'Verifique se o LED de operação da PCB externa (HAP) está piscando regularmente (1 Hz)'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips isolada', 'Alicate decapador'],
    safetyPrecautions: ['Desenergizar o disjuntor geral antes de manusear os bornes'],
    testProcedures: ['Medição de tensão DC pulsante nos bornes de sinal e teste de continuidade']
  },
  'daikin:L5': {
    code: 'L5',
    brand: 'Daikin',
    category: 'Compressor / IPM',
    severity: 'critical',
    title: 'Daikin: Sobrecorrente Instantânea no Compressor Inverter (Módulo IPM)',
    description: 'Pico de corrente excessiva detectado no módulo de potência inteligente (IPM) durante o acionamento do compressor swing/scroll Daikin.',
    probableCauses: [
      'Compressor com enrolamentos em curto-circuito ou travamento mecânico do rotor',
      'Módulo IPM danificado na placa PCB de controle do inversor',
      'Válvula de expansão eletrônica (EEV) travada em posição fechada gerando sobrepressão'
    ],
    stepByStepSolution: [
      'Desligue o disjuntor e aguarde 5 minutos para descarga total do barramento DC (>300V)',
      'Desconecte o conector do compressor e meça a resistência ôhmica entre as fases U-V, V-W e U-W (devem ser perfeitamente equilibradas)',
      'Meça o isolamento elétrico das bobinas em relação à carcaça com megômetro (>10 MΩ)',
      'Teste os diodos do módulo IPM na placa externa na escala de semicondutores'
    ],
    requiredTools: ['Multímetro Digital', 'Megômetro / Megger', 'Chave Phillips e Fenda'],
    safetyPrecautions: ['Cuidado com tensão residual do circuito DC-Link'],
    testProcedures: ['Equilíbrio de resistência U-V-W do compressor e teste de fuga à terra']
  },
  'daikin:E7': {
    code: 'E7',
    brand: 'Daikin',
    category: 'Ventilador',
    severity: 'high',
    title: 'Daikin: Falha no Motor do Ventilador da Unidade Externa (DC Fan)',
    description: 'Travamento ou falta de rotação no motor do ventilador da condensadora Daikin ou perda do sinal de feedback Hall.',
    probableCauses: [
      'Hélice travada por detritos, sujeira ou corpo estranho',
      'Conector do motor solto ou com pinos oxidados na placa PCB',
      'Motor do ventilador DC queimado ou placa inversora com defeito no acionamento'
    ],
    stepByStepSolution: [
      'Verifique com as mãos se a hélice gira com suavidade sem atrito',
      'Inspecione o chicote de conexão do motor do ventilador na placa externa',
      'Meça a tensão de alimentação Vdc (aprox. 310V DC) e Vcc (15V DC) no conector do motor',
      'Substitua o motor DC Fan caso as tensões de controle estejam presentes mas o motor não responda'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips'],
    safetyPrecautions: ['Aguardar a parada total da hélice antes de intervir'],
    testProcedures: ['Medição de tensões de alimentação Vdc, Vcc e sinal Vsp do motor DC Fan']
  },
  'daikin:E1': {
    code: 'E1',
    brand: 'Daikin',
    category: 'Placa Eletrônica',
    severity: 'critical',
    title: 'Daikin: Falha na Placa Eletrônica Principal da Unidade Externa (PCB)',
    description: 'Erro de hardware ou corrupção de microprocessador detectado na placa de controle da condensadora Daikin.',
    probableCauses: [
      'Surto de tensão elétrica ou descarga atmosférica',
      'Circuito de reset da PCB avariado',
      'Falha na memória EEPROM da placa'
    ],
    stepByStepSolution: [
      'Desligue o disjuntor por 5 minutos para reiniciar a memória e religue',
      'Meça a tensão de entrada 220V ± 10% nos bornes principais',
      'Inspecione varistores e fusíveis da placa de controle',
      'Substitua a placa PCB externa se o erro persistir após a reinicialização'
    ],
    requiredTools: ['Multímetro', 'Chaves isoladas'],
    safetyPrecautions: ['Equipamento energizado requer atenção redobrada com choque elétrico'],
    testProcedures: ['Teste de fontes de baixa tensão (5V e 12V na placa)']
  },
  'daikin:A5': {
    code: 'A5',
    brand: 'Daikin',
    category: 'Proteção Térmica',
    severity: 'medium',
    title: 'Daikin: Controle de Alta Pressão no Resfriamento ou Anticongelamento',
    description: 'Temperatura da serpentina evaporadora excessivamente baixa (risco de congelamento) ou sobrepressão no ciclo de aquecimento.',
    probableCauses: [
      'Filtros de ar ou serpentina evaporadora com sujeira pesada obstruindo fluxo',
      'Turbina/ventilador interno girando em velocidade reduzida',
      'Subcarga de fluido refrigerante'
    ],
    stepByStepSolution: [
      'Higienize completamente os filtros de ar e a serpentina',
      'Verifique a rotação do motor da turbina evaporadora',
      'Monitore o superaquecimento e a pressão de sucção no manifold'
    ],
    requiredTools: ['Manifold Digital', 'Termômetro de Contato', 'Bolsa de Higienização'],
    safetyPrecautions: ['Proteger componentes eletrônicos contra água durante a lavagem'],
    testProcedures: ['Cálculo de Superaquecimento Útil e medição de fluxo de ar']
  },
  'daikin:U0': {
    code: 'U0',
    brand: 'Daikin',
    category: 'Fluido / Vazamento',
    severity: 'high',
    title: 'Daikin: Falta de Fluido Refrigerante / Queda Anormal de Pressão',
    description: 'O sistema Daikin detectou elevação excessiva da temperatura de descarga do compressor combinada com baixa temperatura de evaporação.',
    probableCauses: [
      'Vazamento de fluido refrigerante nas conexões flangeadas',
      'Válvula de expansão eletrônica (EEV) travada parcialmente fechada',
      'Válvulas de serviço da condensadora fechadas'
    ],
    stepByStepSolution: [
      'Conecte o manifold e meça as pressões de trabalho',
      'Aplique detector eletrônico de vazamento ou espuma nas conexões',
      'Corrija eventuais vazamentos, realize vácuo e recarregue por peso (balança)'
    ],
    requiredTools: ['Manifold Digital', 'Detector de Vazamento', 'Balança de Carga', 'Bomba de Vácuo'],
    safetyPrecautions: ['Não descarregar fluido na atmosfera'],
    testProcedures: ['Teste de estanqueidade com Nitrogênio a 400 PSI']
  },

  // LG
  'lg:CH05': {
    code: 'CH05',
    brand: 'LG',
    category: 'Comunicação',
    severity: 'high',
    title: 'LG: Falha de Comunicação Serial (Unidade Interna x Unidade Externa)',
    description: 'A placa da unidade interna LG não recebe dados seriais da unidade externa pelo cabo de comunicação (Borne 3) após tentativa de sincronização.',
    probableCauses: [
      'Cabo de comunicação (PP) rompido, com emendas oxidadas ou invertido no borne 3',
      'Ausência de aterramento dedicado provocando indução de ruído eletromagnético',
      'Placa eletrônica da condensadora sem alimentação ou com fusível de 3.15A queimado'
    ],
    stepByStepSolution: [
      'Verifique as conexões nos bornes 1(L), 2(N), 3(Sinal) e Terra na evaporadora e condensadora',
      'Com o equipamento ligado, meça com multímetro na escala DCV entre os bornes 2 (Neutro) e 3 (Sinal): o valor deve oscilar continuamente entre 0V e 75V DC',
      'Se a tensão ficar fixa em 0V ou não oscilar, desligue a força e teste a continuidade do cabo borne 3',
      'Inspecione os LEDs vermelho e verde da placa externa da condensadora'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips isolada', 'Decapador de cabos'],
    safetyPrecautions: ['Desligar o disjuntor geral antes de refazer conexões elétricas'],
    testProcedures: ['Medição de tensão DC pulsante de comunicação e teste de continuidade']
  },
  'lg:CH10': {
    code: 'CH10',
    brand: 'LG',
    category: 'Ventilador',
    severity: 'high',
    title: 'LG: Falha / Travamento do Motor BLDC da Unidade Interna',
    description: 'A placa evaporadora LG não detecta o sinal de rotação gerado pelo sensor Hall integrado ao motor do ventilador BLDC.',
    probableCauses: [
      'Turbina da evaporadora travada mecanicamente ou com atrito na carcaça',
      'Conector do motor BLDC desconectado ou com mau contato na placa',
      'Motor do ventilador queimado ou circuito de acionamento da placa danificado'
    ],
    stepByStepSolution: [
      'Gire a turbina com a mão com o aparelho desligado para confirmar se gira livremente',
      'Inspecione o chicote elétrico do motor do ventilador',
      'Meça as tensões no conector do motor BLDC: Vdc (aprox. 310V DC), Vcc (15V DC), Vsp (controle 0 a 5V) e Vfg (pulsos de feedback)',
      'Substitua o motor BLDC caso as tensões de alimentação estejam corretas'
    ],
    requiredTools: ['Multímetro Digital', 'Chave Phillips'],
    safetyPrecautions: ['Aguardar descarga de capacitores antes de desconectar motores BLDC'],
    testProcedures: ['Teste de tensões do motor BLDC (Vdc, Vcc, Vsp, Vfg)']
  },
  'lg:CH21': {
    code: 'CH21',
    brand: 'LG',
    category: 'Compressor / Inversor',
    severity: 'critical',
    title: 'LG: Sobrecorrente de Pico DC (Módulo IPM / Compressor)',
    description: 'Pico de sobrecorrente instantânea no estágio inversor de potência (IPM) que aciona o compressor Dual Inverter da LG.',
    probableCauses: [
      'Compressor com enrolamentos em curto ou travado mecanicamente',
      'Módulo IPM da placa externa em curto-circuito',
      'Excesso de carga de gás ou obstrução mecânica gerando alta pressão de descarga'
    ],
    stepByStepSolution: [
      'Desligue o disjuntor e aguarde 5 minutos',
      'Desconecte os cabos do compressor e meça a resistência ôhmica entre as 3 fases U, V e W (devem apresentar resistências idênticas entre si, geralmente 0.8Ω a 3.0Ω)',
      'Meça isolamento das fases para o aterramento / carcaça (>10 MΩ)',
      'Teste os diodos do módulo IPM na placa com o multímetro na escala de diodo'
    ],
    requiredTools: ['Multímetro Digital', 'Megômetro', 'Manifold'],
    safetyPrecautions: ['Barramento DC retém mais de 300V por vários minutos após o desligamento'],
    testProcedures: ['Medição de resistência U-V-W e teste de ponte inversora IPM']
  },

  // MIDEA / SPRINGER
  'midea:EC': {
    code: 'EC',
    brand: 'Midea',
    category: 'Fluido / Vazamento',
    severity: 'high',
    title: 'Midea: Detecção de Vazamento de Fluido Refrigerante',
    description: 'O microcontrolador detectou que o compressor está operando mas o sensor de serpentina evaporadora (T2) não atinge a temperatura esperada, indicando perda de carga de refrigerante.',
    probableCauses: [
      'Vazamento de fluido refrigerante nas porcas flange ou serpentinas',
      'Sensor de serpentina T2 descalibrado (10 kΩ ou 20 kΩ a 25°C)',
      'Válvula de serviço da condensadora esquecida fechada ou capilar obstruído'
    ],
    stepByStepSolution: [
      'Instale o manifold e verifique as pressões de sucção e trabalho',
      'Aplique detector de vazamento ou água com sabão nas conexões flangeadas',
      'Teste a resistência ôhmica do sensor T2 evaporadora',
      'Repare a flange defeituosa, faça vácuo profundo (<500 microns) e recarregue por peso'
    ],
    requiredTools: ['Manifold Digital', 'Balança de Precisão', 'Vacuômetro', 'Bomba de Vácuo', 'Detector de Vazamento'],
    safetyPrecautions: ['Nunca liberar fluido refrigerante na atmosfera'],
    testProcedures: ['Pressurização com nitrogênio seco a 350-450 PSI para estanqueidade']
  },
  'midea:E1': {
    code: 'E1',
    brand: 'Midea',
    category: 'Sensor / Comunicação',
    severity: 'high',
    title: 'Midea: Erro de Comunicação entre Unidades ou Falha de EEPROM',
    description: 'Perda de transmissão serial contínua entre a evaporadora e condensadora ou erro de leitura dos parâmetros na memória EEPROM.',
    probableCauses: [
      'Cabo de comunicação (Borne S ou 3) solto, rompido ou oxidado',
      'Falta de aterramento adequado gerando travamento da comunicação',
      'Placa externa desenergizada ou com falha na fonte chaveada'
    ],
    stepByStepSolution: [
      'Verifique os bornes de conexão 1(L), 2(N), S(Sinal) e Terra',
      'Meça a tensão de sinal serial nos bornes',
      'Desligue o disjuntor por 3 minutos e religue para reiniciar os microprocessadores'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips'],
    safetyPrecautions: ['Desligar energia antes de inspecionar bornes'],
    testProcedures: ['Teste de continuidade nos cabos de sinal e alimentação']
  },

  // GREE
  'gree:E6': {
    code: 'E6',
    brand: 'Gree',
    category: 'Comunicação',
    severity: 'high',
    title: 'Gree: Falha de Comunicação entre Unidade Interna e Externa',
    description: 'Interrupção na linha de dados seriais de sincronismo entre a placa de controle da evaporadora e condensadora Gree.',
    probableCauses: [
      'Cabo de comunicação de dados rompido, invertido ou com emendas oxidadas',
      'Interferência eletromagnética por ausência de cabo terra ou cabo de sinal sem blindagem',
      'Acoplador óptico da placa com defeito ou placa externa sem energia'
    ],
    stepByStepSolution: [
      'Inspecione os bornes 1, 2, COM e Terra na evaporadora e condensadora',
      'Meça a oscilação de tensão DC entre a linha de comunicação e neutro/terra',
      'Substitua o trecho de cabo por fiação contínua'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips'],
    safetyPrecautions: ['Desenergizar o equipamento antes da manutenção'],
    testProcedures: ['Teste de sinal de comunicação e continuidade de condutores']
  },
  'gree:F0': {
    code: 'F0',
    brand: 'Gree',
    category: 'Fluido / Vazamento',
    severity: 'high',
    title: 'Gree: Proteção por Falta / Vazamento de Fluido Refrigerante',
    description: 'Compressor em funcionamento sem variação de temperatura detectada na serpentina, acionando o bloqueio preventivo Gree.',
    probableCauses: [
      'Vazamento total ou parcial de fluido refrigerante',
      'Sensor de serpentina descalibrado',
      'Válvulas de serviço esquecidas fechadas após instalação'
    ],
    stepByStepSolution: [
      'Instale o manifold e certifique-se de que as válvulas de sucção e líquido estão 100% abertas',
      'Meça a pressão de trabalho com o compressor ativo',
      'Faça busca minuciosa de vazamentos nas flanges com detector ou espuma',
      'Refaça as flanges, efetue vácuo e complete a carga por balança'
    ],
    requiredTools: ['Manifold Digital', 'Detector de Vazamento', 'Balança de Carga'],
    safetyPrecautions: ['Usar óculos e luvas de proteção contra queimaduras de refrigerante'],
    testProcedures: ['Pressurização com nitrogênio e cálculo de superaquecimento']
  },

  // SAMSUNG
  'samsung:E101': {
    code: 'E101',
    brand: 'Samsung',
    category: 'Comunicação',
    severity: 'high',
    title: 'Samsung: Erro de Comunicação Serial (Unidade Interna não recebe da Externa)',
    description: 'A unidade interna Samsung Digital Inverter não consegue estabelecer conexão de dados através dos bornes F1 e F2.',
    probableCauses: [
      'Cabo de comunicação F1/F2 rompido, frouxo ou invertido',
      'Placa eletrônica da condensadora desenergizada',
      'Interferência eletromagnética na linha de sinal'
    ],
    stepByStepSolution: [
      'Verifique as conexões nos bornes F1 e F2 na evaporadora e condensadora',
      'Verifique se os LEDs da placa condensadora estão acesos',
      'Meça a tensão de sinal serial F1-F2 com multímetro (deve oscilar)',
      'Troque os cabos por fiação adequada sem emendas'
    ],
    requiredTools: ['Multímetro True-RMS', 'Chave Phillips'],
    safetyPrecautions: ['Desligar disjuntor de alimentação'],
    testProcedures: ['Medição de tensão DC de sinal nos bornes F1 e F2']
  }
};

export async function diagnoseErrorCode(brand: string, query: string, equipmentType?: string): Promise<DiagnosisResult> {
  if (!query || !brand) {
    throw new Error('Informe o fabricante e o código de erro ou descrição do defeito.');
  }

  const cleanBrand = brand.trim();
  const rawQuery = query.trim();
  const lowerQuery = rawQuery.toLowerCase();
  const normalizedBrandName = normalizeBrand(cleanBrand);
  const cleanCode = rawQuery.toUpperCase().replace(/\s+/g, '');
  const compositeKey = `${normalizedBrandName}:${cleanCode}`;
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';

  // 1. VERIFICAÇÃO INSTANTÂNEA NA BASE DE DEFEITOS CLÍNICOS E SINTOMAS
  for (const symptom of SYMPTOM_DATABASE) {
    const isMatch = symptom.keywords.some((kw) => {
      return lowerQuery.includes(kw) || kw.includes(lowerQuery);
    });

    if (isMatch) {
      return {
        code: rawQuery,
        brand: cleanBrand,
        category: symptom.category,
        severity: symptom.severity,
        title: symptom.title.replace('Defeito:', `${cleanBrand} - Defeito:`),
        description: `${symptom.description} (Análise especializada para condicionadores de ar ${cleanBrand}).`,
        probableCauses: symptom.probableCauses,
        stepByStepSolution: symptom.stepByStepSolution,
        requiredTools: symptom.requiredTools,
        safetyPrecautions: symptom.safetyPrecautions,
        testProcedures: symptom.testProcedures,
      };
    }
  }

  // 2. DIAGNÓSTICO COM IA (GEMINI 2.5 FLASH COM VALIDAÇÃO E SEGUNDA TENTATIVA AUTOMÁTICA)
  if (apiKey && !apiKey.includes('your-') && !apiKey.includes('placeholder')) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const generatePrompt = (isRetry: boolean = false) => `Você é um engenheiro sênior especialista em diagnóstico de ar-condicionado (HVAC-R).
O técnico em campo informou a seguinte entrada:
Fabricante: ${cleanBrand}
Consulta/Código/Defeito: "${rawQuery}"
Tipo de Equipamento: ${equipmentType || 'Split Hi-Wall / Inverter / Cassete / Piso Teto / VRF'}
${isRetry ? 'ATENÇÃO: A tentativa anterior falhou por campos ausentes. Certifique-se de preencher OBRIGATORIAMENTE os arrays "probableCauses" (mínimo 3 causas) e "stepByStepSolution" (mínimo 4 passos práticos com testes).' : ''}

INSTRUÇÕES IMPORTANTES:
1. A entrada pode ser um CÓDIGO DE ERRO (ex: E1, CH05, U4, EC, F0) OU a DESCRIÇÃO DE UM DEFEITO/SINTOMA (ex: "não gela", "compressor esquenta e desliga", "congelando tubo fino", "pingando água", "desarmando disjuntor").
2. Forneça o diagnóstico técnico REAL e EXATO de acordo com a engenharia da ${cleanBrand}.
3. Retorne EXCLUSIVAMENTE um JSON puro válido com a seguinte estrutura OBRIGATÓRIA:
{
  "code": "${rawQuery}",
  "brand": "${cleanBrand}",
  "category": "Rendimento | Fluido / Vazamento | Comunicação | Compressor / Inversor | Ventilador | Drenagem | Elétrica / Curto | Sensor",
  "severity": "low | medium | high | critical",
  "title": "${cleanBrand}: Título técnico claro e completo do diagnóstico",
  "description": "Explicação técnica minuciosa da causa física, elétrica ou termodinâmica",
  "probableCauses": ["Causa provável 1 detalhada", "Causa provável 2 detalhada", "Causa provável 3 detalhada"],
  "stepByStepSolution": ["Passo 1 detalhado com testes", "Passo 2", "Passo 3", "Passo 4"],
  "requiredTools": ["Multímetro True-RMS", "Manifold Digital", "Termômetro de Contato"],
  "safetyPrecautions": ["Desligar disjuntor geral antes de manusear componentes"],
  "testProcedures": ["Procedimento de medição e teste prático"]
}`;

      // --- PRIMEIRA TENTATIVA COM A IA ---
      let parsedResult: any = null;
      try {
        const response1 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: generatePrompt(false),
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const text1 = response1.text || '';
        if (text1) {
          parsedResult = JSON.parse(text1);
        }
      } catch (err1) {
        console.warn(`[Amigo Diagnostics] Primeira tentativa com IA falhou para ${cleanBrand} - ${rawQuery}:`, err1);
      }

      // --- PASSO DE VERIFICAÇÃO DOS CAMPOS OBRIGATÓRIOS ---
      if (!isValidDiagnosis(parsedResult)) {
        console.warn(`[Amigo Diagnostics] Resposta incompleta na 1ª tentativa. Disparando segunda tentativa de validação...`);
        try {
          const response2 = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: generatePrompt(true),
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const text2 = response2.text || '';
          if (text2) {
            parsedResult = JSON.parse(text2);
          }
        } catch (err2) {
          console.warn(`[Amigo Diagnostics] Segunda tentativa também falhou:`, err2);
        }
      }

      // Se a resposta validada estiver completa após a verificação / retry
      if (isValidDiagnosis(parsedResult)) {
        return {
          code: rawQuery,
          brand: cleanBrand,
          category: parsedResult.category || 'Diagnóstico Especializado',
          severity: parsedResult.severity || 'medium',
          title: parsedResult.title.trim(),
          description: parsedResult.description || `Diagnóstico gerado para ${cleanBrand} - ${rawQuery}.`,
          probableCauses: parsedResult.probableCauses,
          stepByStepSolution: parsedResult.stepByStepSolution,
          requiredTools: Array.isArray(parsedResult.requiredTools) && parsedResult.requiredTools.length > 0 ? parsedResult.requiredTools : ['Multímetro True-RMS', 'Manifold Digital', 'Chaves Isoladas'],
          safetyPrecautions: Array.isArray(parsedResult.safetyPrecautions) && parsedResult.safetyPrecautions.length > 0 ? parsedResult.safetyPrecautions : ['Desligar o disjuntor geral antes de manusear conexões'],
          testProcedures: Array.isArray(parsedResult.testProcedures) && parsedResult.testProcedures.length > 0 ? parsedResult.testProcedures : ['Medição de grandezas elétricas e termodinâmicas'],
        };
      }
    } catch (err: any) {
      console.warn(`[Amigo Diagnostics] Ativando base técnica calibrada para ${cleanBrand} - ${rawQuery}`);
    }
  }

  // 3. BUSCA POR CÓDIGO EXATO NA BASE DE CÓDIGOS OFICIAIS
  if (BRAND_CODE_DATABASE[compositeKey]) {
    return {
      ...BRAND_CODE_DATABASE[compositeKey],
      brand: cleanBrand,
      code: rawQuery,
    };
  }

  // 4. VERIFICAÇÃO DE ALIASES DA MARCA
  if (normalizedBrandName === 'lg') {
    const lgKey = `lg:CH${cleanCode.replace(/^CH/i, '')}`;
    if (BRAND_CODE_DATABASE[lgKey]) {
      return {
        ...BRAND_CODE_DATABASE[lgKey],
        brand: cleanBrand,
        code: rawQuery,
      };
    }
  }

  if (normalizedBrandName === 'fujitsu') {
    const fujitsuKey = `fujitsu:E:${cleanCode.replace(/^E:?/i, '')}`;
    if (BRAND_CODE_DATABASE[fujitsuKey]) {
      return {
        ...BRAND_CODE_DATABASE[fujitsuKey],
        brand: cleanBrand,
        code: rawQuery,
      };
    }
  }

  // 5. DIAGNÓSTICO CALIBRADO AMIGÁVEL E ESTRUTURADO (FALLBACK ROBUSTO GARANTIDO)
  const isCommCode = cleanCode.includes('CH05') || cleanCode.includes('U4') || cleanCode.includes('E6') || cleanCode.includes('E101') || cleanCode.includes('COM') || lowerQuery.includes('comunicação') || lowerQuery.includes('comunicacao');
  const isSensorCode = cleanCode.includes('TH') || cleanCode.includes('C4') || cleanCode.includes('C9') || cleanCode.includes('CH01') || cleanCode.includes('CH02') || cleanCode.includes('E121') || lowerQuery.includes('sensor') || lowerQuery.includes('termistor');
  const isPowerCode = cleanCode.includes('L5') || cleanCode.includes('P4') || cleanCode.includes('CH21') || cleanCode.includes('E464') || cleanCode.includes('IPM') || lowerQuery.includes('sobrecorrente') || lowerQuery.includes('inversor');
  const isLeakCode = cleanCode === 'EC' || cleanCode === 'F0' || cleanCode === 'U0' || lowerQuery.includes('vazamento') || lowerQuery.includes('falta de gas') || lowerQuery.includes('falta de gás');
  const isFanCode = cleanCode.includes('E7') || cleanCode.includes('CH10') || cleanCode.includes('H6') || cleanCode.includes('E458') || cleanCode.includes('FAN') || lowerQuery.includes('ventilador') || lowerQuery.includes('turbina');

  let category = 'Diagnóstico Técnico Especializado';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let title = `${cleanBrand}: Análise Técnica para "${rawQuery}"`;
  let description = `Diagnóstico técnico detalhado para a verificação de "${rawQuery}" em sistemas de climatização ${cleanBrand}.`;
  let probableCauses = [
    `Oscilação de tensão elétrica ou anomalia no circuito de comando da ${cleanBrand}`,
    'Descalibração em sensores térmicos (sondas termistoras de 5kΩ a 20kΩ a 25°C)',
    'Pressões de trabalho ou fluxo de ar fora dos parâmetros nominais'
  ];
  let stepByStepSolution = [
    `Desligue o disjuntor geral da ${cleanBrand} por 5 minutos para reiniciar a memória da placa eletrônica`,
    'Meça a tensão de entrada nos bornes L e N com multímetro (tensão recomendada: 220V ± 10%) e confira o aterramento',
    'Conecte o manifold digital e verifique o Superaquecimento e a pressão de sucção em operação',
    'Inspecione os chicotes elétricos e teste a resistência ôhmica dos sensores térmicos'
  ];
  let requiredTools = ['Multímetro True-RMS', 'Manifold Digital', 'Termômetro de Contato', 'Chaves Isoladas'];
  let safetyPrecautions = ['Trabalhar sempre com o sistema desenergizado ao medir resistências e manipular conectores'];
  let testProcedures = ['Medição de tensão de alimentação, corrente nominal e curva ôhmica dos sensores'];

  if (isLeakCode) {
    category = 'Fluido / Vazamento';
    severity = 'high';
    title = `${cleanBrand}: Detecção de Vazamento / Perda de Carga Frigorígena (${rawQuery})`;
    description = `O sistema da ${cleanBrand} detectou perda de rendimento térmico ou pressão de evaporação insuficiente com compressor em operação.`;
    probableCauses = [
      'Vazamento de fluido refrigerante nas porcas flange ou serpentina',
      'Válvulas de serviço esquecidas fechadas após instalação ou manutenção',
      'Sensor de serpentina descalibrado'
    ];
    stepByStepSolution = [
      'Instale o manifold e meça as pressões de trabalho e o superaquecimento',
      'Faça busca de vazamentos com detector eletrônico ou espuma nas conexões flangeadas',
      'Efetue vácuo profundo (<500 microns) e recarregue a quantidade exata por peso na balança'
    ];
    requiredTools = ['Manifold Digital', 'Balança de Precisão', 'Detector de Vazamento', 'Bomba de Vácuo'];
    safetyPrecautions = ['Usar luvas e óculos de proteção contra queimaduras por fluido refrigerante'];
    testProcedures = ['Teste de estanqueidade com Nitrogênio pressurizado a 400 PSI'];
  } else if (isCommCode) {
    category = 'Comunicação';
    severity = 'high';
    title = `${cleanBrand}: Falha de Comunicação Serial entre Unidades (${rawQuery})`;
    description = `Interrupção na linha de transmissão de dados e sincronismo entre a placa evaporadora e condensadora da ${cleanBrand}.`;
    probableCauses = [
      'Cabo de sinal serial rompido, invertido nos bornes ou com emenda oxidada',
      'Ruído eletromagnético por ausência de aterramento dedicado',
      'Placa eletrônica condensadora sem alimentação ou com fusível queimado'
    ];
    stepByStepSolution = [
      'Verifique o aperto e a correspondência dos bornes de interligação',
      'Meça a tensão de sinal serial com multímetro True-RMS (deve oscilar continuamente em corrente contínua)',
      'Verifique se os LEDs de status da placa externa estão piscando normalmente'
    ];
    requiredTools = ['Multímetro True-RMS', 'Chaves Isoladas', 'Alicate Decapador'];
    safetyPrecautions = ['Desligar o disjuntor geral antes de manusear os bornes'];
    testProcedures = ['Medição de tensão DC pulsante de comunicação e teste de continuidade de condutores'];
  }

  return {
    code: rawQuery,
    brand: cleanBrand,
    category,
    severity,
    title,
    description,
    probableCauses,
    stepByStepSolution,
    requiredTools,
    safetyPrecautions,
    testProcedures,
  };
}
