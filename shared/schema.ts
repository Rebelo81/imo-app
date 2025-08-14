import { pgTable, text, serial, integer, decimal, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  photo: text("photo"),
  // Admin field
  isAdmin: boolean("is_admin").default(false).notNull(),
  lastActiveAt: timestamp("last_active_at"),
  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // active, canceled, cancel_at_period_end, past_due, unpaid
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  subscriptionCanceledAt: timestamp("subscription_canceled_at"),
  hasSeenWelcomeModal: boolean("hasseenwelcomemodal").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  company: z.string().optional(),
  photo: z.string().optional(),
});

// Schema para upload de arquivo
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
    .refine(
      (file) => ["image/png", "image/jpeg", "image/jpg"].includes(file.type),
      "Apenas arquivos PNG e JPEG são aceitos"
    ),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Client model
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userSequentialId: integer("user_sequential_id").notNull(), // ID sequencial por usuário (1, 2, 3...)
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userClientIdx: index("client_user_sequential_idx").on(table.userId, table.userSequentialId),
}));

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, userSequentialId: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Property model
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  userSequentialId: integer("user_sequential_id").notNull(), // ID sequencial por usuário (1, 2, 3...)
  name: text("name").notNull(),
  type: text("type").notNull(),
  unit: text("unit"),
  area: decimal("area"),
  description: text("description"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userPropertyIdx: index("property_user_sequential_idx").on(table.userId, table.userSequentialId),
}));

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, userSequentialId: true, createdAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Projection Strategy Enum
export const PROJECTION_STRATEGY = {
  FUTURE_SALE: "FUTURE_SALE",
  ASSET_APPRECIATION: "ASSET_APPRECIATION",
  RENTAL_YIELD: "RENTAL_YIELD",
} as const;

export type ProjectionStrategy = typeof PROJECTION_STRATEGY[keyof typeof PROJECTION_STRATEGY];

// Projection model
export const projections = pgTable("projections", {
  id: serial("id").primaryKey(),
  userSequentialId: integer("user_sequential_id").notNull(), // ID sequencial por usuário (1, 2, 3...)
  title: text("titulo").notNull(),
  clientId: integer("cliente_id").notNull(),
  propertyId: integer("imovel_id").notNull(),
  strategies: jsonb("estrategias").notNull().$type<ProjectionStrategy[]>(),
  // Dados básicos
  propertyName: text("nome_imovel"),
  propertyType: text("tipo_imovel"),
  propertyUnit: text("unidade_imovel"),
  propertyArea: decimal("area_imovel"),
  propertyDescription: text("descricao_imovel"),
  propertyImageUrl: text("imagem_imovel_url"),
  propertyWebsiteUrl: text("site_imovel_url"),
  // Endereço
  address: text("endereco"),
  neighborhood: text("bairro"),
  city: text("cidade"),
  state: text("estado"),
  zipCode: text("cep"),
  // Dados de compra
  deliveryMonths: integer("prazo_entrega").notNull(),
  deliveryTime: text("tempo_entrega"),
  listPrice: decimal("valor_tabela").notNull(),
  discount: decimal("valor_desconto").default("0"),
  downPayment: decimal("valor_entrada").notNull(),
  paymentMonths: integer("prazo_pagamento").notNull(),
  monthlyCorrection: decimal("correcao_mensal").notNull(),
  indiceCorrecao: text("indice_correcao"),
  postDeliveryCorrection: decimal("correcao_apos_entrega").default("0"),
  indiceCorrecaoAposChaves: text("indice_correcao_apos_chaves"),
  includeBonusPayments: boolean("tem_reforcos").default(false),
  bonusFrequency: integer("frequencia_reforcos").default(0),
  bonusValue: decimal("valor_reforco").default("0"),
  hasKeys: boolean("tem_chaves").default(false),
  keysValue: decimal("valor_chaves").default("0"),
  tipoParcelamento: text("tipo_parcelamento").default("automatico"), // "automatico" | "personalizado"
  // Configurações de cenários
  scenarioType: text("tipo_cenario").default("padrao"),
  activeScenario: text("cenario_ativo").default("padrao"),
  selectedScenarios: jsonb("cenarios_selecionados").default([]),
  // Cenário Padrão
  padraoFutureSaleInvestmentPeriod: text("padrao_venda_prazo"),
  padraoFutureSaleAppreciationRate: text("padrao_venda_valorizacao"),
  padraoFutureSaleSellingExpenseRate: text("padrao_venda_comissao"),
  padraoFutureSaleIncomeTaxRate: text("padrao_venda_impostos"),
  padraoFutureSaleAdditionalCosts: text("padrao_venda_custos_adicionais"),
  padraoFutureSaleMaintenanceCosts: text("padrao_venda_custos_manutencao"),
  padraoAssetAppreciationAnnualRate: text("padrao_valorizacao_taxa_anual"),
  padraoAssetAppreciationAnalysisPeriod: text("padrao_valorizacao_periodo"),
  padraoAssetAppreciationMaintenanceCosts: text("padrao_valorizacao_manutencao"),
  padraoAssetAppreciationAnnualTaxes: text("padrao_valorizacao_impostos"),
  padraoRentalYieldMonthlyRent: text("padrao_aluguel_valor_mensal"),
  padraoRentalYieldOccupancyRate: text("padrao_aluguel_ocupacao"),
  padraoRentalYieldManagementFee: text("padrao_aluguel_taxa_administracao"),
  padraoRentalYieldMaintenanceCosts: text("padrao_aluguel_manutencao"),
  padraoRentalYieldAnnualIncrease: text("padrao_aluguel_reajuste_anual"),
  // Cenário Conservador
  conservadorFutureSaleInvestmentPeriod: text("conservador_venda_prazo"),
  conservadorFutureSaleAppreciationRate: text("conservador_venda_valorizacao"),
  conservadorFutureSaleSellingExpenseRate: text("conservador_venda_comissao"),
  conservadorFutureSaleIncomeTaxRate: text("conservador_venda_impostos"),
  conservadorFutureSaleAdditionalCosts: text("conservador_venda_custos_adicionais"),
  conservadorFutureSaleMaintenanceCosts: text("conservador_venda_custos_manutencao"),
  conservadorAssetAppreciationAnnualRate: text("conservador_valorizacao_taxa_anual"),
  conservadorAssetAppreciationAnalysisPeriod: text("conservador_valorizacao_periodo"),
  conservadorAssetAppreciationMaintenanceCosts: text("conservador_valorizacao_manutencao"),
  conservadorAssetAppreciationAnnualTaxes: text("conservador_valorizacao_impostos"),
  conservadorRentalYieldMonthlyRent: text("conservador_aluguel_valor_mensal"),
  conservadorRentalYieldOccupancyRate: text("conservador_aluguel_ocupacao"),
  conservadorRentalYieldManagementFee: text("conservador_aluguel_taxa_administracao"),
  conservadorRentalYieldMaintenanceCosts: text("conservador_aluguel_manutencao"),
  conservadorRentalYieldAnnualIncrease: text("conservador_aluguel_reajuste_anual"),
  // Cenário Otimista
  otimistaFutureSaleInvestmentPeriod: text("otimista_venda_prazo"),
  otimistaFutureSaleAppreciationRate: text("otimista_venda_valorizacao"),
  otimistaFutureSaleSellingExpenseRate: text("otimista_venda_comissao"),
  otimistaFutureSaleIncomeTaxRate: text("otimista_venda_impostos"),
  otimistaFutureSaleAdditionalCosts: text("otimista_venda_custos_adicionais"),
  otimistaFutureSaleMaintenanceCosts: text("otimista_venda_custos_manutencao"),
  otimistaAssetAppreciationAnnualRate: text("otimista_valorizacao_taxa_anual"),
  otimistaAssetAppreciationAnalysisPeriod: text("otimista_valorizacao_periodo"),
  otimistaAssetAppreciationMaintenanceCosts: text("otimista_valorizacao_manutencao"),
  otimistaAssetAppreciationAnnualTaxes: text("otimista_valorizacao_impostos"),
  otimistaRentalYieldMonthlyRent: text("otimista_aluguel_valor_mensal"),
  otimistaRentalYieldOccupancyRate: text("otimista_aluguel_ocupacao"),
  otimistaRentalYieldManagementFee: text("otimista_aluguel_taxa_administracao"),
  otimistaRentalYieldMaintenanceCosts: text("otimista_aluguel_manutencao"),
  otimistaRentalYieldAnnualIncrease: text("otimista_aluguel_reajuste_anual"),
  // Valores calculados
  futureValuePercentage: decimal("percentual_valor_futuro").default("0"),
  futureValueMonth: integer("mes_valor_futuro").default(0),
  saleCommission: decimal("comissao_venda").default("0"),
  saleTaxes: decimal("impostos_venda").default("0"),
  incomeTax: decimal("imposto_renda").default("0"),
  additionalCosts: decimal("custos_adicionais").default("0"),
  appreciationYears: integer("anos_valorizacao").default(0),
  annualAppreciation: decimal("valorizacao_anual").default("0"),
  maintenanceCosts: decimal("custos_manutencao").default("0"),
  rentalType: text("tipo_aluguel").default("annual"),
  monthlyRental: decimal("aluguel_mensal").default("0"),
  furnishingCosts: decimal("custos_mobilia").default("0"),
  condoFees: decimal("taxa_condominio").default("0"),
  propertyTax: decimal("iptu").default("0"),
  calculationResults: jsonb("resultados_calculo").default({}),
  userId: integer("usuario_id").notNull(),
  createdAt: timestamp("data_criacao").defaultNow().notNull(),
  updatedAt: timestamp("data_atualizacao").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("projection_client_idx").on(table.clientId),
  propertyIdx: index("projection_property_idx").on(table.propertyId),
  userIdx: index("projection_user_idx").on(table.userId),
  userProjectionIdx: index("projection_user_sequential_idx").on(table.userId, table.userSequentialId),
}));

export const insertProjectionSchema = createInsertSchema(projections).omit({ id: true, userSequentialId: true, createdAt: true, updatedAt: true });
export type InsertProjection = z.infer<typeof insertProjectionSchema>;
// Definindo tipos para os resultados de cálculo
export type CalculationResultFutureSale = {
  purchasePrice: number;
  totalInvestment: number;
  futureValue: number;
  saleExpenses: number;
  grossProfit: number;
  incomeTax: number;
  netProfit: number;
  roi: number;
  irr: number;
  paybackMonths: number;
};

export type CalculationResultAssetAppreciation = {
  initialValue: number;
  totalMaintenance: number;
  finalValue: number;
  appreciationPercentage: number;
};

export type CalculationResultRentalYield = {
  initialInvestment: number;
  furnishingCosts: number;
  totalReturnPercentage: number;
  // Novos campos para rendimento mensal e anual líquido
  monthlyNetIncome: number;
  annualNetIncome: number;
};

export type CashFlowItem = {
  month: number;
  description: string;
  amount: number;
};

export type YearlyDataItem = {
  year: number;
  propertyValue?: number;
  appreciation?: number;
  netValue?: number;
  rentalIncome?: number;
  expenses?: number;
  netIncome?: number;
  yieldRate?: number;
};

export type ParcelaFinanciamento = {
  mes: number;
  data: string;
  tipoPagamento: 'Entrada' | 'Parcela' | 'Reforço' | 'Chaves';
  valorBase: number;
  percentualCorrecao: number;
  valorCorrigido: number;
  saldoDevedor: number;
  saldoLiquido: number;
  correcaoAcumulada: number;
  taxaCorrecaoEditavel?: number;
};

export type ResumoFinanciamento = {
  valorImovel: number;
  valorEntrada: number;
  valorFinanciado: number;
  prazoEntrega: number;
  prazoPagamento: number;
  totalParcelas: number;
  totalCorrecao: number;
  percentualCorrecao: number;
  valorTotal: number;
};

export type ResultadoFinanciamentoPlanta = {
  parcelas: ParcelaFinanciamento[];
  resumo: ResumoFinanciamento;
};

export type CalculationResults = {
  roi?: number;
  irr?: number;
  paybackMonths?: number;
  netProfit?: number;
  futureSale?: CalculationResultFutureSale;
  assetAppreciation?: CalculationResultAssetAppreciation;
  rentalYield?: CalculationResultRentalYield;
  futureSaleCashFlow?: CashFlowItem[];
  assetAppreciationYearly?: YearlyDataItem[];
  rentalYieldYearly?: YearlyDataItem[];
  calculosProjecao?: CalculoProjecao[];
  financiamentoPlanta?: ResultadoFinanciamentoPlanta;
};

export type Projection = typeof projections.$inferSelect & {
  client?: Client;
  property?: Property;
  calculationResults?: CalculationResults;
  // Campos adicionais de cenários que precisam estar na resposta da API
  padrao_venda_prazo?: string | number | null;
  conservador_venda_prazo?: string | number | null;
  otimista_venda_prazo?: string | number | null;
  // Campos de valorização para os diferentes cenários (venda futura)
  padrao_venda_valorizacao?: string | number | null;
  conservador_venda_valorizacao?: string | number | null;
  otimista_venda_valorizacao?: string | number | null;
  // Campos de valorização patrimonial para os diferentes cenários
  padrao_valorizacao_taxa_anual?: string | number | null;
  conservador_valorizacao_taxa_anual?: string | number | null;
  otimista_valorizacao_taxa_anual?: string | number | null;
  // Campos de período de valorização para os diferentes cenários
  padrao_valorizacao_periodo?: string | number | null;
  conservador_valorizacao_periodo?: string | number | null;
  otimista_valorizacao_periodo?: string | number | null;
};

// Transaction model for cash flow tracking
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull(),
  month: integer("month").notNull(),
  baseAmount: decimal("base_amount").notNull(),
  correction: decimal("correction").notNull(),
  correctedAmount: decimal("corrected_amount").notNull(),
  bonusPayment: decimal("bonus_payment").default("0"),
  totalAmount: decimal("total_amount").notNull(),
  type: text("type").notNull(), // payment, income, expense
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectionIdx: index("transaction_projection_idx").on(table.projectionId),
}));

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Financial Indexes model for storing economic indices from Central Bank
export const financialIndexes = pgTable("financial_indexes", {
  id: serial("id").primaryKey(),
  indexType: text("index_type").notNull(), // 'ipca' | 'igpm' | 'selic' | 'cdi'
  month: text("month").notNull(), // formato: '2024-05'
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  valueMonthly: decimal("value_monthly", { precision: 10, scale: 4 }), // For SELIC: monthly variation %
  valueAnnualEquivalent: decimal("value_annual_equivalent", { precision: 10, scale: 4 }), // For SELIC: annual equivalent %
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexTypeMonthIdx: index("financial_indexes_type_month_idx").on(table.indexType, table.month),
  monthIdx: index("financial_indexes_month_idx").on(table.month),
}));

export const insertFinancialIndexSchema = createInsertSchema(financialIndexes).omit({ id: true, createdAt: true });
export type InsertFinancialIndex = z.infer<typeof insertFinancialIndexSchema>;
export type FinancialIndex = typeof financialIndexes.$inferSelect;

// Schema for validating index types
export const indexTypeSchema = z.enum(['ipca', 'igpm', 'selic', 'cdi']);
export type IndexType = z.infer<typeof indexTypeSchema>;

// SELIC Meta table for storing current SELIC target rate from COPOM
export const selicMeta = pgTable("selic_meta", {
  id: serial("id").primaryKey(),
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSelicMetaSchema = createInsertSchema(selicMeta).omit({ id: true, updatedAt: true });
export type InsertSelicMeta = z.infer<typeof insertSelicMetaSchema>;
export type SelicMeta = typeof selicMeta.$inferSelect;

// SELIC Acumulada table for storing current accumulated annual SELIC rate
export const selicAcumulada = pgTable("selic_acumulada", {
  id: serial("id").primaryKey(),
  indexType: text("index_type").notNull().default("selic_acumulada"),
  referenceDate: text("reference_date").notNull(), // formato: '2025-06-18'
  valueAnnual: decimal("value_annual", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSelicAcumuladaSchema = createInsertSchema(selicAcumulada).omit({ id: true, createdAt: true });
export type InsertSelicAcumulada = z.infer<typeof insertSelicAcumuladaSchema>;
export type SelicAcumulada = typeof selicAcumulada.$inferSelect;

// INCC Indexes table for storing INCC-M data from Sinduscon-PR scraping
export const inccIndexes = pgTable("incc_indexes", {
  id: serial("id").primaryKey(),
  indexType: text("index_type").notNull().default("incc"),
  month: text("month").notNull(), // formato: '2024-06'
  value: decimal("value", { precision: 10, scale: 4 }).notNull(), // variação mensal (%)
  source: text("source").notNull().default("sinduscon-pr"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  monthIdx: index("incc_indexes_month_idx").on(table.month),
  indexTypeMonthIdx: index("incc_indexes_type_month_idx").on(table.indexType, table.month),
}));

export const insertInccIndexSchema = createInsertSchema(inccIndexes).omit({ id: true, createdAt: true });
export type InsertInccIndex = z.infer<typeof insertInccIndexSchema>;
export type InccIndex = typeof inccIndexes.$inferSelect;

// CUB-SC Indexes table for storing CUB-SC data from Sinduscon BC scraping
export const cubScIndexes = pgTable("cub_sc_indexes", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(), // formato: '2024-06'
  monthlyVariation: decimal("monthly_variation", { precision: 10, scale: 4 }).notNull(), // variação mensal (%)
  yearAccumulated: decimal("year_accumulated", { precision: 10, scale: 4 }).notNull().default("0"), // acumulado do ano (%)
  twelveMonthAccumulated: decimal("twelve_month_accumulated", { precision: 10, scale: 4 }).notNull().default("0"), // acumulado 12 meses (%)
  source: text("source").notNull().default("sinduscon-bc"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  monthIdx: index("cub_sc_indexes_month_idx").on(table.month),
  monthSourceIdx: index("cub_sc_indexes_month_source_idx").on(table.month, table.source),
}));

export const insertCubScIndexSchema = createInsertSchema(cubScIndexes).omit({ id: true, createdAt: true });
export type InsertCubScIndex = z.infer<typeof insertCubScIndexSchema>;
export type CubScIndex = typeof cubScIndexes.$inferSelect;

// Tabela de cálculo de projeções (detalhes mensais)
export const calculoProjecoes = pgTable("calculo_projecoes", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull(),
  mes: integer("mes").notNull(),
  scenario: text("scenario").default("padrao").notNull(), // Cenário: padrao, conservador, otimista
  mesDaVenda: integer("mes_da_venda").default(0), // Mês da venda para o cenário
  taxaCorrecao: decimal("taxa_correcao").notNull().default("0"), // Nova coluna unificada
  taxaAcumulada: decimal("taxa_acumulada").notNull().default("1"),
  valorEntrada: decimal("valor_entrada").notNull().default("0"),
  parcelaBase: decimal("parcela_base").notNull().default("0"),
  parcelaCorrigida: decimal("parcela_corrigida").notNull().default("0"),
  reforcoBase: decimal("reforco_base").notNull().default("0"),
  reforcoCorrigido: decimal("reforco_corrigido").notNull().default("0"),
  valorChaves: decimal("valor_chaves").notNull().default("0"),
  chavesCorrigido: decimal("chaves_corrigido").notNull().default("0"),
  pagamentoTotal: decimal("pagamento_total").notNull().default("0"),
  pagamentoTotalLiquido: decimal("pagamento_total_liquido").notNull().default("0"),
  saldoLiquido: decimal("saldo_liquido").notNull(),
  saldoDevedorCorrigido: decimal("saldo_devedor_corrigido").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectionIdx: index("calculo_projection_idx").on(table.projectionId),
  mesIdx: index("calculo_mes_idx").on(table.mes),
  scenarioIdx: index("calculo_scenario_idx").on(table.scenario),
}));

export const insertCalculoProjecaoSchema = createInsertSchema(calculoProjecoes).omit({ id: true, createdAt: true });
export type InsertCalculoProjecao = z.infer<typeof insertCalculoProjecaoSchema>;
export type CalculoProjecao = typeof calculoProjecoes.$inferSelect;

// Tabela de links públicos para compartilhamento de relatórios
export const publicReportLinks = pgTable("public_report_links", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(), // UUID público para o link
  projectionId: integer("projection_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title"), // Título do compartilhamento
  description: text("description"), // Descrição opcional
  isActive: boolean("is_active").default(true).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  creatorIp: text("creator_ip"), // IP do usuário que criou o link
  creatorUserAgent: text("creator_user_agent"), // User-Agent do usuário que criou o link
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Opcional: data de expiração
}, (table) => ({
  publicIdIdx: index("public_report_public_id_idx").on(table.publicId),
  projectionIdx: index("public_report_projection_idx").on(table.projectionId),
  userIdx: index("public_report_user_idx").on(table.userId),
}));

export const insertPublicReportLinkSchema = createInsertSchema(publicReportLinks).omit({ id: true, createdAt: true });
export type InsertPublicReportLink = z.infer<typeof insertPublicReportLinkSchema>;
export type PublicReportLink = typeof publicReportLinks.$inferSelect;

// Tabela de logs de acesso aos relatórios públicos
export const publicReportAccessLogs = pgTable("public_report_access_logs", {
  id: serial("id").primaryKey(),
  publicReportLinkId: integer("public_report_link_id").notNull(),
  ip: text("ip").notNull(),
  userAgent: text("user_agent").notNull(),
  browser: text("browser"),
  deviceType: text("device_type"),
  deviceModel: text("device_model"),
  os: text("os"),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  isCreator: boolean("is_creator").default(false).notNull(),
}, (table) => ({
  publicReportLinkIdx: index("access_log_public_report_link_idx").on(table.publicReportLinkId),
  accessedAtIdx: index("access_log_accessed_at_idx").on(table.accessedAt),
  isCreatorIdx: index("access_log_is_creator_idx").on(table.isCreator),
}));

export const insertPublicReportAccessLogSchema = createInsertSchema(publicReportAccessLogs).omit({ id: true, accessedAt: true });
export type InsertPublicReportAccessLog = z.infer<typeof insertPublicReportAccessLogSchema>;
export type PublicReportAccessLog = typeof publicReportAccessLogs.$inferSelect;

// Schema simplificado para o endpoint de registro de acesso
export const publicReportAccessSchema = z.object({
  public_id: z.string().min(1, "Public ID é obrigatório"),
  browser: z.string().optional(),
  device_type: z.string().optional(),
  device_model: z.string().optional(),
  os: z.string().optional(),
});

// Tabela de logs de webhooks do Stripe
export const stripeWebhookLogs = pgTable("stripe_webhook_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // checkout.session.completed, subscription.updated, etc.
  statusCode: integer("status_code").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  bodyPreview: text("body_preview"), // Primeiros 500 caracteres do payload
  fullBody: jsonb("full_body"), // Payload completo do webhook
  handled: boolean("handled").default(false).notNull(),
  errorMessage: text("error_message"),
}, (table) => ({
  typeIdx: index("webhook_log_type_idx").on(table.type),
  receivedAtIdx: index("webhook_log_received_at_idx").on(table.receivedAt),
  handledIdx: index("webhook_log_handled_idx").on(table.handled),
}));

export const insertStripeWebhookLogSchema = createInsertSchema(stripeWebhookLogs).omit({ id: true, receivedAt: true });
export type InsertStripeWebhookLog = z.infer<typeof insertStripeWebhookLogSchema>;
export type StripeWebhookLog = typeof stripeWebhookLogs.$inferSelect;
