// Fonte única das regras comerciais usadas por servidor e telas.
// Plano anual: o cliente paga ANNUAL_MONTHS_CHARGED meses e usa 12 ("2 meses grátis").
export const ANNUAL_MONTHS_CHARGED = 10;
export const ANNUAL_PRICE_FACTOR = ANNUAL_MONTHS_CHARGED / 12;

// Plano único de venda: o "Flex" fica oculto nas telas, mas assinantes antigos continuam válidos no servidor.
export const SHOW_FLEX_PLAN = false;

// Módulos escondidos no lançamento (o código continua no projeto; basta trocar para true para reativar).
export const SHOW_STOCK_MODULE = false; // Estoque do técnico
export const SHOW_SMTP_SETTINGS = false; // E-mail SMTP próprio de cada usuário (envio automático já configurado continua funcionando)
