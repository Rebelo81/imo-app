import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  photo: text("photo"),
  // Admin field
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }),
  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // active, canceled, cancel_at_period_end, past_due, unpaid
  subscriptionStartDate: integer("subscription_start_date", { mode: "timestamp" }),
  subscriptionCurrentPeriodEnd: integer("subscription_current_period_end", { mode: "timestamp" }),
  subscriptionCanceledAt: integer("subscription_canceled_at", { mode: "timestamp" }),
  hasSeenWelcomeModal: integer("hasseenwelcomemodal", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userSequentialId: integer("user_sequential_id").notNull(), // ID sequencial por usuário (1, 2, 3...)
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, userSequentialId: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Property model
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userSequentialId: integer("user_sequential_id").notNull(), // ID sequencial por usuário (1, 2, 3...)
  name: text("name").notNull(),
  type: text("type").notNull(),
  unit: text("unit"),
  area: real("area"),
  description: text("description"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

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

// Projection model (simplified for SQLite)
export const projections = sqliteTable("projections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userSequentialId: integer("user_sequential_id").notNull(),
  title: text("titulo").notNull(),
  clientId: integer("cliente_id").notNull(),
  propertyId: integer("imovel_id").notNull(),
  strategies: text("estrategias").notNull(), // JSON string
  // Dados básicos
  propertyName: text("nome_imovel"),
  propertyType: text("tipo_imovel"),
  propertyUnit: text("unidade_imovel"),
  propertyArea: real("area_imovel"),
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
  listPrice: real("valor_tabela").notNull(),
  discount: real("valor_desconto").default(0),
  downPayment: real("valor_entrada").notNull(),
  paymentMonths: integer("prazo_pagamento").notNull(),
  monthlyCorrection: real("correcao_mensal").notNull(),
  indiceCorrecao: text("indice_correcao"),
  postDeliveryCorrection: real("correcao_apos_entrega").default(0),
  indiceCorrecaoAposChaves: text("indice_correcao_apos_chaves"),
  includeBonusPayments: integer("tem_reforcos", { mode: "boolean" }).default(false),
  bonusFrequency: integer("frequencia_reforcos").default(0),
  bonusValue: real("valor_reforco").default(0),
  hasKeys: integer("tem_chaves", { mode: "boolean" }).default(false),
  keysValue: real("valor_chaves").default(0),
  tipoParcelamento: text("tipo_parcelamento").default("automatico"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertProjectionSchema = createInsertSchema(projections).omit({ id: true, userSequentialId: true, createdAt: true });
export type InsertProjection = z.infer<typeof insertProjectionSchema>;
export type Projection = typeof projections.$inferSelect;