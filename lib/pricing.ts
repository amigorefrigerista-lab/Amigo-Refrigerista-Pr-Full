// Fonte única das regras comerciais usadas por servidor e telas.
// Plano anual: o cliente paga ANNUAL_MONTHS_CHARGED meses e usa 12 ("2 meses grátis").
export const ANNUAL_MONTHS_CHARGED = 10;
export const ANNUAL_PRICE_FACTOR = ANNUAL_MONTHS_CHARGED / 12;

// Planos oficiais unificados: Plano Flex (R$ 19,90/mês) e Plano Pró (R$ 39,90/mês) visíveis em todas as telas.
export const SHOW_FLEX_PLAN = true;
export const OFFICIAL_FLEX_PLAN_PRICE = 19.9;
export const OFFICIAL_PRO_PLAN_PRICE = 39.9;

/**
 * Normaliza o preço do Plano Pró garantindo que o valor legado de R$ 49,90 (ou 499,00)
 * salvo anteriormente no banco online seja corrigido para o valor oficial unificado de R$ 39,90.
 */
export function normalizeProPlanPrice(rawPrice: unknown): number {
  const num = Number(rawPrice);
  if (!Number.isFinite(num) || num <= 0) {
    return OFFICIAL_PRO_PLAN_PRICE;
  }
  if (Math.abs(num - 49.9) < 0.05 || Math.abs(num - 499) < 0.5) {
    return OFFICIAL_PRO_PLAN_PRICE;
  }
  return num;
}

/**
 * Normaliza o preço do Plano Flex garantindo o padrão oficial de R$ 19,90.
 */
export function normalizeFlexPlanPrice(rawPrice: unknown): number {
  const num = Number(rawPrice);
  if (!Number.isFinite(num) || num <= 0) {
    return OFFICIAL_FLEX_PLAN_PRICE;
  }
  return num;
}

// Módulos escondidos no lançamento (o código continua no projeto; basta trocar para true para reativar).
export const SHOW_STOCK_MODULE = false; // Estoque do técnico
export const SHOW_SMTP_SETTINGS = false; // E-mail SMTP próprio de cada usuário (envio automático já configurado continua funcionando)

