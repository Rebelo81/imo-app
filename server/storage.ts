import {
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  properties, type Property, type InsertProperty,
  projections, type Projection, type InsertProjection,
  transactions, type Transaction, type InsertTransaction,
  calculoProjecoes, type CalculoProjecao, type InsertCalculoProjecao,
  publicReportLinks, type PublicReportLink, type InsertPublicReportLink,
  publicReportAccessLogs, type PublicReportAccessLog, type InsertPublicReportAccessLog,
  stripeWebhookLogs, type StripeWebhookLog, type InsertStripeWebhookLog
} from "@shared/schema";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { db } = require("./db");
import { eq, max, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  getUserBasicInfoByStripeCustomerId(stripeCustomerId: string): Promise<{id: number, name: string, email: string} | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserSubscription(id: number, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionStartDate?: Date;
    subscriptionCurrentPeriodEnd?: Date;
    subscriptionCanceledAt?: Date;
  }): Promise<User | undefined>;

  // Client operations
  getClients(userId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Property operations
  getProperties(userId: number): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Projection operations
  getProjections(userId: number): Promise<Projection[]>;
  getProjection(id: number): Promise<Projection | undefined>;
  createProjection(projection: InsertProjection): Promise<Projection>;
  updateProjection(id: number, projection: Partial<Projection>): Promise<Projection | undefined>;
  deleteProjection(id: number): Promise<boolean>;

  // Transaction operations
  getTransactions(projectionId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  deleteTransactionsByProjection(projectionId: number): Promise<boolean>;
  
  // CalculoProjecao operations
  getCalculosProjecao(projectionId: number): Promise<CalculoProjecao[]>;
  getCalculoProjecao(id: number): Promise<CalculoProjecao | undefined>;
  createCalculoProjecao(calculo: InsertCalculoProjecao): Promise<CalculoProjecao>;
  createCalculosProjecao(calculos: InsertCalculoProjecao[]): Promise<CalculoProjecao[]>;
  deleteCalculosByProjection(projectionId: number): Promise<boolean>;

  // Public Report Link operations
  getPublicReportLink(publicId: string): Promise<PublicReportLink | undefined>;
  getPublicReportLinksByProjection(projectionId: number): Promise<PublicReportLink[]>;
  createPublicReportLink(link: InsertPublicReportLink): Promise<PublicReportLink>;
  updatePublicReportLink(id: number, link: Partial<PublicReportLink>): Promise<PublicReportLink | undefined>;
  deletePublicReportLink(id: number): Promise<boolean>;
  incrementViewCount(publicId: string): Promise<boolean>;

  // Public Report Access Log operations
  createPublicReportAccessLog(log: InsertPublicReportAccessLog): Promise<PublicReportAccessLog>;
  updatePublicReportAccessLog(id: number, log: Partial<PublicReportAccessLog>): Promise<PublicReportAccessLog | undefined>;
  getPublicReportAccessLogs(publicReportLinkId: number): Promise<PublicReportAccessLog[]>;
  deletePublicReportAccessLog(id: number): Promise<boolean>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUsersWithProjectionCounts(): Promise<(User & { projectionCount: number })[]>;
  updateUserLastActive(id: number): Promise<User | undefined>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    subscriptionsEndingSoon: number;
    usersOnlineNow: number;
  }>;

  // Stripe Webhook Log operations
  createStripeWebhookLog(log: InsertStripeWebhookLog): Promise<StripeWebhookLog>;
  getStripeWebhookLogs(limit?: number, type?: string): Promise<StripeWebhookLog[]>;
  getStripeWebhookLog(id: number): Promise<StripeWebhookLog | undefined>;
  updateStripeWebhookLog(id: number, log: Partial<StripeWebhookLog>): Promise<StripeWebhookLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Helper functions for sequential IDs per user
  private async getNextClientSequentialId(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ maxId: max(clients.userSequentialId) })
        .from(clients)
        .where(eq(clients.userId, userId));
      return (result[0]?.maxId || 0) + 1;
    } catch (error) {
      console.error("Error getting next client sequential ID:", error);
      return 1;
    }
  }

  private async getNextPropertySequentialId(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ maxId: max(properties.userSequentialId) })
        .from(properties)
        .where(eq(properties.userId, userId));
      return (result[0]?.maxId || 0) + 1;
    } catch (error) {
      console.error("Error getting next property sequential ID:", error);
      return 1;
    }
  }

  private async getNextProjectionSequentialId(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ maxId: max(projections.userSequentialId) })
        .from(projections)
        .where(eq(projections.userId, userId));
      return (result[0]?.maxId || 0) + 1;
    } catch (error) {
      console.error("Error getting next projection sequential ID:", error);
      return 1;
    }
  }

  // CalculoProjecao operations
  async getCalculosProjecao(projectionId: number): Promise<CalculoProjecao[]> {
    try {
      return await db
        .select()
        .from(calculoProjecoes)
        .where(eq(calculoProjecoes.projectionId, projectionId))
        .orderBy(calculoProjecoes.mes);
    } catch (error) {
      console.error("Erro ao buscar cálculos da projeção:", error);
      return [];
    }
  }

  async getCalculoProjecao(id: number): Promise<CalculoProjecao | undefined> {
    try {
      const [calculo] = await db
        .select()
        .from(calculoProjecoes)
        .where(eq(calculoProjecoes.id, id));
      return calculo || undefined;
    } catch (error) {
      console.error("Erro ao buscar cálculo por ID:", error);
      return undefined;
    }
  }

  async createCalculoProjecao(insertCalculo: InsertCalculoProjecao): Promise<CalculoProjecao> {
    try {
      // Preparar dados específicos que precisam ser convertidos
      const preparedData = {
        ...insertCalculo,
        // Converter valores numéricos para decimal string
        taxaCorrecao: String(insertCalculo.taxaCorrecao || 0),
        taxaAcumulada: String(insertCalculo.taxaAcumulada || 1),
        valorEntrada: String(insertCalculo.valorEntrada || 0),
        parcelaBase: String(insertCalculo.parcelaBase || 0),
        parcelaCorrigida: String(insertCalculo.parcelaCorrigida || 0),
        reforcoBase: String(insertCalculo.reforcoBase || 0),
        reforcoCorrigido: String(insertCalculo.reforcoCorrigido || 0),
        valorChaves: String(insertCalculo.valorChaves || 0),
        chavesCorrigido: String(insertCalculo.chavesCorrigido || 0),
        pagamentoTotal: String(insertCalculo.pagamentoTotal || 0),
        pagamentoTotalLiquido: String(insertCalculo.pagamentoTotalLiquido || 0),
        saldoLiquido: String(insertCalculo.saldoLiquido),
        saldoDevedorCorrigido: String(insertCalculo.saldoDevedorCorrigido)
      };
      
      const [calculo] = await db
        .insert(calculoProjecoes)
        .values(preparedData)
        .returning();
      return calculo;
    } catch (error) {
      console.error("Erro ao criar cálculo de projeção:", error);
      throw error;
    }
  }

  async createCalculosProjecao(insertCalculos: InsertCalculoProjecao[]): Promise<CalculoProjecao[]> {
    try {
      if (insertCalculos.length === 0) return [];
      
      // Preparar dados específicos que precisam ser convertidos
      const preparedData = insertCalculos.map(calculo => ({
        ...calculo,
        // Converter valores numéricos para decimal string
        taxaCorrecao: String(calculo.taxaCorrecao || 0),
        taxaAcumulada: String(calculo.taxaAcumulada || 1),
        valorEntrada: String(calculo.valorEntrada || 0),
        parcelaBase: String(calculo.parcelaBase || 0),
        parcelaCorrigida: String(calculo.parcelaCorrigida || 0),
        reforcoBase: String(calculo.reforcoBase || 0),
        reforcoCorrigido: String(calculo.reforcoCorrigido || 0),
        valorChaves: String(calculo.valorChaves || 0),
        chavesCorrigido: String(calculo.chavesCorrigido || 0),
        pagamentoTotal: String(calculo.pagamentoTotal || 0),
        pagamentoTotalLiquido: String(calculo.pagamentoTotalLiquido || 0),
        saldoLiquido: String(calculo.saldoLiquido),
        saldoDevedorCorrigido: String(calculo.saldoDevedorCorrigido)
      }));
      
      const calculos = await db
        .insert(calculoProjecoes)
        .values(preparedData)
        .returning();
      return calculos;
    } catch (error) {
      console.error("Erro ao criar múltiplos cálculos de projeção:", error);
      throw error;
    }
  }

  async deleteCalculosByProjection(projectionId: number): Promise<boolean> {
    try {
      await db
        .delete(calculoProjecoes)
        .where(eq(calculoProjecoes.projectionId, projectionId));
      return true;
    } catch (error) {
      console.error("Erro ao excluir cálculos por projeção:", error);
      return false;
    }
  }

  // Public Report Link operations
  async getPublicReportLink(publicId: string): Promise<PublicReportLink | undefined> {
    try {
      const [link] = await db
        .select()
        .from(publicReportLinks)
        .where(eq(publicReportLinks.publicId, publicId))
        .limit(1);
      return link;
    } catch (error) {
      console.error("Error fetching public report link:", error);
      return undefined;
    }
  }

  async getPublicReportLinksByProjection(projectionId: number): Promise<PublicReportLink[]> {
    try {
      return await db
        .select()
        .from(publicReportLinks)
        .where(eq(publicReportLinks.projectionId, projectionId));
    } catch (error) {
      console.error("Error fetching public report links by projection:", error);
      return [];
    }
  }

  async createPublicReportLink(insertLink: InsertPublicReportLink): Promise<PublicReportLink> {
    try {
      const [link] = await db
        .insert(publicReportLinks)
        .values(insertLink)
        .returning();
      return link;
    } catch (error) {
      console.error("Error creating public report link:", error);
      throw error;
    }
  }

  async updatePublicReportLink(id: number, linkData: Partial<PublicReportLink>): Promise<PublicReportLink | undefined> {
    try {
      const [link] = await db
        .update(publicReportLinks)
        .set(linkData)
        .where(eq(publicReportLinks.id, id))
        .returning();
      return link;
    } catch (error) {
      console.error("Error updating public report link:", error);
      return undefined;
    }
  }

  async deletePublicReportLink(id: number): Promise<boolean> {
    try {
      await db
        .delete(publicReportLinks)
        .where(eq(publicReportLinks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting public report link:", error);
      return false;
    }
  }

  async incrementViewCount(publicId: string): Promise<boolean> {
    try {
      await db
        .update(publicReportLinks)
        .set({ 
          viewCount: sql`view_count + 1`
        })
        .where(eq(publicReportLinks.publicId, publicId));
      return true;
    } catch (error) {
      console.error("Error incrementing view count:", error);
      return false;
    }
  }

  // Public Report Access Log operations
  async createPublicReportAccessLog(insertLog: InsertPublicReportAccessLog): Promise<PublicReportAccessLog> {
    try {
      const [log] = await db
        .insert(publicReportAccessLogs)
        .values(insertLog)
        .returning();
      return log;
    } catch (error) {
      console.error("Error creating public report access log:", error);
      throw error;
    }
  }

  async updatePublicReportAccessLog(id: number, logData: Partial<PublicReportAccessLog>): Promise<PublicReportAccessLog | undefined> {
    try {
      const [log] = await db
        .update(publicReportAccessLogs)
        .set(logData)
        .where(eq(publicReportAccessLogs.id, id))
        .returning();
      return log;
    } catch (error) {
      console.error("Error updating public report access log:", error);
      return undefined;
    }
  }

  async getPublicReportAccessLogs(publicReportLinkId: number): Promise<PublicReportAccessLog[]> {
    try {
      return await db
        .select()
        .from(publicReportAccessLogs)
        .where(eq(publicReportAccessLogs.publicReportLinkId, publicReportLinkId))
        .orderBy(publicReportAccessLogs.accessedAt);
    } catch (error) {
      console.error("Error fetching public report access logs:", error);
      return [];
    }
  }

  async deletePublicReportAccessLogsByLinkId(publicReportLinkId: number): Promise<boolean> {
    try {
      await db
        .delete(publicReportAccessLogs)
        .where(eq(publicReportAccessLogs.publicReportLinkId, publicReportLinkId));
      return true;
    } catch (error) {
      console.error("Error deleting public report access logs:", error);
      return false;
    }
  }

  async deletePublicReportAccessLog(id: number): Promise<boolean> {
    try {
      await db
        .delete(publicReportAccessLogs)
        .where(eq(publicReportAccessLogs.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting public report access log:", error);
      return false;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return undefined;
    }
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user by stripe customer ID:", error);
      return undefined;
    }
  }

  async getUserBasicInfoByStripeCustomerId(stripeCustomerId: string): Promise<{id: number, name: string, email: string} | undefined> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.stripeCustomerId, stripeCustomerId));
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user basic info by stripe customer ID:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async updateUserSubscription(id: number, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionStartDate?: Date;
    subscriptionCurrentPeriodEnd?: Date;
    subscriptionCanceledAt?: Date;
  }): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          stripeCustomerId: subscriptionData.stripeCustomerId,
          stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
          subscriptionStatus: subscriptionData.subscriptionStatus,
          subscriptionStartDate: subscriptionData.subscriptionStartDate,
          subscriptionCurrentPeriodEnd: subscriptionData.subscriptionCurrentPeriodEnd,
          subscriptionCanceledAt: subscriptionData.subscriptionCanceledAt,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error("Error updating user subscription:", error);
      return undefined;
    }
  }

  // Client operations
  async getClients(userId: number): Promise<Client[]> {
    try {
      return await db
        .select()
        .from(clients)
        .where(eq(clients.userId, userId));
    } catch (error) {
      console.error("Error fetching clients:", error);
      return [];
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id));
      return client || undefined;
    } catch (error) {
      console.error("Error fetching client:", error);
      return undefined;
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      const userSequentialId = await this.getNextClientSequentialId(insertClient.userId);
      const [client] = await db
        .insert(clients)
        .values({
          ...insertClient,
          userSequentialId
        })
        .returning();
      return client;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    try {
      const [client] = await db
        .update(clients)
        .set(clientData)
        .where(eq(clients.id, id))
        .returning();
      return client || undefined;
    } catch (error) {
      console.error("Error updating client:", error);
      return undefined;
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(clients)
        .where(eq(clients.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      return false;
    }
  }

  // Property operations
  async getProperties(userId: number): Promise<Property[]> {
    try {
      return await db
        .select()
        .from(properties)
        .where(eq(properties.userId, userId));
    } catch (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
  }

  async getProperty(id: number): Promise<Property | undefined> {
    try {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, id));
      return property || undefined;
    } catch (error) {
      console.error("Error fetching property:", error);
      return undefined;
    }
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    try {
      const userSequentialId = await this.getNextPropertySequentialId(insertProperty.userId);
      const [property] = await db
        .insert(properties)
        .values({
          ...insertProperty,
          userSequentialId
        })
        .returning();
      return property;
    } catch (error) {
      console.error("Error creating property:", error);
      throw error;
    }
  }

  async updateProperty(id: number, propertyData: Partial<Property>): Promise<Property | undefined> {
    try {
      const [property] = await db
        .update(properties)
        .set(propertyData)
        .where(eq(properties.id, id))
        .returning();
      return property || undefined;
    } catch (error) {
      console.error("Error updating property:", error);
      return undefined;
    }
  }

  async deleteProperty(id: number): Promise<boolean> {
    try {
      await db
        .delete(properties)
        .where(eq(properties.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting property:", error);
      return false;
    }
  }

  // Projection operations
  async getProjections(userId: number): Promise<Projection[]> {
    try {
      console.log(`DEBUG: Buscando projeções para o usuário ${userId}`);
      
      // Usar SQL nativo com JOIN para buscar a imagem da propriedade
      const result = await db.execute(
        sql`SELECT 
          p.id, p.user_sequential_id, p.titulo, p.cliente_id, p.imovel_id, p.estrategias, p.nome_imovel, 
          p.tipo_imovel, p.unidade_imovel, p.area_imovel, p.descricao_imovel, 
          p.endereco, p.bairro, p.cidade, p.estado, p.cep, 
          p.prazo_entrega, p.tempo_entrega, p.valor_tabela, p.valor_desconto, 
          p.valor_entrada, p.prazo_pagamento, p.correcao_mensal, p.indice_correcao, 
          p.correcao_apos_entrega, p.indice_correcao_apos_chaves, 
          p.tem_reforcos, p.frequencia_reforcos, p.valor_reforco, 
          p.tem_chaves, p.valor_chaves, 
          p.tipo_cenario, p.cenario_ativo, p.cenarios_selecionados, 
          p.resultados_calculo, p.usuario_id, p.data_criacao, p.data_atualizacao,
          
          -- Campos de prazos para venda em cenários
          p.padrao_venda_prazo, p.conservador_venda_prazo, p.otimista_venda_prazo,
          
          -- Campos de valorização para venda em cenários
          p.padrao_venda_valorizacao, p.conservador_venda_valorizacao, p.otimista_venda_valorizacao,
          
          -- Campos de custos de manutenção para venda em cenários
          p.padrao_venda_custos_manutencao, p.conservador_venda_custos_manutencao, p.otimista_venda_custos_manutencao,
          
          -- Campos específicos para valorização patrimonial
          p.padrao_valorizacao_taxa_anual, p.conservador_valorizacao_taxa_anual, p.otimista_valorizacao_taxa_anual,
          p.padrao_valorizacao_periodo, p.conservador_valorizacao_periodo, p.otimista_valorizacao_periodo,
          p.padrao_valorizacao_manutencao, p.conservador_valorizacao_manutencao, p.otimista_valorizacao_manutencao,
          
          -- Buscar imagem da propriedade
          prop.image_url as property_image_url,
          
          -- Buscar dados do cliente
          c.name as client_name
        FROM projections p
        LEFT JOIN properties prop ON p.imovel_id = prop.id
        LEFT JOIN clients c ON p.cliente_id = c.id
        WHERE p.usuario_id = ${userId}`
      );
      
      console.log(`DEBUG: Query executada com sucesso`);
      
      if (!result.rows || result.rows.length === 0) {
        console.log("Nenhuma projeção encontrada para o usuário");
        return [];
      }
      
      // Mapear os resultados para o formato esperado
      const projections: Projection[] = result.rows.map(row => ({
        id: row.id,
        userSequentialId: row.user_sequential_id,
        title: row.titulo,
        clientId: row.cliente_id,
        propertyId: row.imovel_id,
        strategies: row.estrategias || [],
        
        // Dados básicos do imóvel
        propertyName: row.nome_imovel,
        propertyType: row.tipo_imovel,
        propertyUnit: row.unidade_imovel,
        propertyArea: row.area_imovel,
        propertyDescription: row.descricao_imovel,
        // CORREÇÃO: Buscar imagem da tabela properties
        propertyImageUrl: row.property_image_url,
        
        // Endereço
        address: row.endereco,
        neighborhood: row.bairro,
        city: row.cidade,
        state: row.estado,
        zipCode: row.cep,
        
        // Dados de compra
        deliveryMonths: row.prazo_entrega,
        deliveryTime: row.tempo_entrega,
        listPrice: row.valor_tabela,
        discount: row.valor_desconto,
        downPayment: row.valor_entrada,
        paymentMonths: row.prazo_pagamento,
        monthlyCorrection: row.correcao_mensal,
        correctionIndex: row.indice_correcao,
        postDeliveryCorrection: row.correcao_apos_entrega,
        postDeliveryCorrectionIndex: row.indice_correcao_apos_chaves,
        includeBonusPayments: row.tem_reforcos,
        bonusFrequency: row.frequencia_reforcos,
        bonusValue: row.valor_reforco,
        hasKeys: row.tem_chaves,
        keysValue: row.valor_chaves,
        
        // Configurações de cenários
        scenarioType: row.tipo_cenario,
        activeScenario: row.cenario_ativo,
        selectedScenarios: row.cenarios_selecionados || [],
        
        calculationResults: row.resultados_calculo || {},
        
        // Incluir dados do cliente
        client: row.client_name ? {
          id: row.cliente_id,
          name: row.client_name
        } : null,
        
        userId: row.usuario_id,
        createdAt: row.data_criacao,
        updatedAt: row.data_atualizacao
      }));
      
      console.log(`DEBUG: Encontradas ${projections.length} projeções`);
      return projections;
    } catch (error) {
      console.error("Error fetching projections:", error);
      return [];
    }
  }

  async getProjection(id: number): Promise<Projection | undefined> {
    try {
      // Usar SQL nativo para evitar problemas com nomes de colunas alterados
      console.log(`DEBUG: Iniciando busca da projeção ID ${id} com consulta SQL nativa`);
      
      // Consulta SQL com campos específicos para garantir que todos os campos necessários são incluídos
      const result = await db.execute(
        sql`SELECT *, user_sequential_id,
          -- Campos de prazos para venda em cenários
          padrao_venda_prazo, conservador_venda_prazo, otimista_venda_prazo,
          
          -- Campos de valorização para venda em cenários
          padrao_venda_valorizacao, conservador_venda_valorizacao, otimista_venda_valorizacao,
          
          -- CAMPOS DE COMISSÃO E CUSTOS DE VENDA - ESSENCIAL PARA CALCULOS DINÂMICOS
          padrao_venda_comissao, conservador_venda_comissao, otimista_venda_comissao,
          padrao_venda_custos_adicionais, conservador_venda_custos_adicionais, otimista_venda_custos_adicionais,
          padrao_venda_impostos, conservador_venda_impostos, otimista_venda_impostos,
          
          -- Campos de custos de manutenção para venda em cenários
          padrao_venda_custos_manutencao, conservador_venda_custos_manutencao, otimista_venda_custos_manutencao,
          
          -- Campos específicos para valorização patrimonial
          padrao_valorizacao_taxa_anual, conservador_valorizacao_taxa_anual, otimista_valorizacao_taxa_anual,
          padrao_valorizacao_periodo, conservador_valorizacao_periodo, otimista_valorizacao_periodo,
          padrao_valorizacao_manutencao, conservador_valorizacao_manutencao, otimista_valorizacao_manutencao,
          
          -- Campos para aluguel em diferentes cenários
          padrao_aluguel_valor_mensal, conservador_aluguel_valor_mensal, otimista_aluguel_valor_mensal,
          padrao_aluguel_ocupacao, conservador_aluguel_ocupacao, otimista_aluguel_ocupacao,
          padrao_aluguel_taxa_administracao, conservador_aluguel_taxa_administracao, otimista_aluguel_taxa_administracao,
          padrao_aluguel_manutencao, conservador_aluguel_manutencao, otimista_aluguel_manutencao,
          padrao_aluguel_reajuste_anual, conservador_aluguel_reajuste_anual, otimista_aluguel_reajuste_anual
        FROM projections WHERE id = ${id}`
      );
      
      if (result.rows.length === 0) {
        console.log(`DEBUG: Nenhuma projeção encontrada com ID ${id}`);
        return undefined;
      }
      
      // Log dos dados brutos para debug
      console.log(`DEBUG: Dados brutos da projeção ID ${id}:`, {
        id: result.rows[0].id,
        titulo: result.rows[0].titulo,
        padrao_venda_prazo: result.rows[0].padrao_venda_prazo,
        conservador_venda_prazo: result.rows[0].conservador_venda_prazo,
        otimista_venda_prazo: result.rows[0].otimista_venda_prazo,
        padrao_venda_valorizacao: result.rows[0].padrao_venda_valorizacao,
        conservador_venda_valorizacao: result.rows[0].conservador_venda_valorizacao,
        otimista_venda_valorizacao: result.rows[0].otimista_venda_valorizacao,
        padrao_venda_custos_manutencao: result.rows[0].padrao_venda_custos_manutencao,
        conservador_venda_custos_manutencao: result.rows[0].conservador_venda_custos_manutencao,
        otimista_venda_custos_manutencao: result.rows[0].otimista_venda_custos_manutencao,
        // CAMPOS DE COMISSÃO E CUSTOS ADICIONAIS - CRÍTICOS PARA CÁLCULOS DINÂMICOS
        padrao_venda_comissao: result.rows[0].padrao_venda_comissao,
        conservador_venda_comissao: result.rows[0].conservador_venda_comissao,
        otimista_venda_comissao: result.rows[0].otimista_venda_comissao,
        padrao_venda_custos_adicionais: result.rows[0].padrao_venda_custos_adicionais,
        conservador_venda_custos_adicionais: result.rows[0].conservador_venda_custos_adicionais,
        otimista_venda_custos_adicionais: result.rows[0].otimista_venda_custos_adicionais,
        padrao_venda_impostos: result.rows[0].padrao_venda_impostos,
        conservador_venda_impostos: result.rows[0].conservador_venda_impostos,
        otimista_venda_impostos: result.rows[0].otimista_venda_impostos
      });
      
      console.log("DEBUG: Resposta SQL completa:", JSON.stringify(result.rows[0]));
      
      // Converter o resultado para o formato de Projection esperado pela aplicação
      // Mapear as colunas em português para os nomes em inglês
      const row = result.rows[0];
      const projection: Projection = {
        id: row.id,
        userSequentialId: row.user_sequential_id,
        title: row.titulo,
        clientId: row.cliente_id,
        propertyId: row.imovel_id,
        strategies: row.estrategias || [],
        
        // Dados básicos do imóvel
        propertyName: row.nome_imovel,
        propertyType: row.tipo_imovel,
        propertyUnit: row.unidade_imovel,
        propertyArea: row.area_imovel,
        propertyDescription: row.descricao_imovel,
        
        // Endereço
        address: row.endereco,
        neighborhood: row.bairro,
        city: row.cidade,
        state: row.estado,
        zipCode: row.cep,
        
        // Dados de compra
        deliveryMonths: row.prazo_entrega,
        deliveryTime: row.tempo_entrega,
        listPrice: row.valor_tabela,
        discount: row.valor_desconto,
        downPayment: row.valor_entrada,
        paymentMonths: row.prazo_pagamento,
        monthlyCorrection: row.correcao_mensal,
        correctionIndex: row.indice_correcao,
        postDeliveryCorrection: row.correcao_apos_entrega,
        postDeliveryCorrectionIndex: row.indice_correcao_apos_chaves,
        includeBonusPayments: row.tem_reforcos,
        bonusFrequency: row.frequencia_reforcos,
        bonusValue: row.valor_reforco,
        hasKeys: row.tem_chaves,
        keysValue: row.valor_chaves,
        
        // Configurações de cenários
        scenarioType: row.tipo_cenario,
        activeScenario: row.cenario_ativo,
        selectedScenarios: row.cenarios_selecionados || [],
        
        calculationResults: row.resultados_calculo || {},
        
        userId: row.usuario_id,
        createdAt: row.data_criacao,
        updatedAt: row.data_atualizacao
      };
      
      // Adicionar os campos de prazo de venda para os diferentes cenários
      // Esses campos são importantes e não estavam sendo incluídos anteriormente
      projection.padrao_venda_prazo = row.padrao_venda_prazo;
      projection.conservador_venda_prazo = row.conservador_venda_prazo;
      projection.otimista_venda_prazo = row.otimista_venda_prazo;
      
      // Adicionar os campos de valorização para os diferentes cenários
      projection.padrao_venda_valorizacao = row.padrao_venda_valorizacao;
      projection.conservador_venda_valorizacao = row.conservador_venda_valorizacao;
      projection.otimista_venda_valorizacao = row.otimista_venda_valorizacao;
      
      // Adicionar os campos de custos de manutenção para os diferentes cenários
      projection.padrao_venda_custos_manutencao = row.padrao_venda_custos_manutencao;
      projection.conservador_venda_custos_manutencao = row.conservador_venda_custos_manutencao;
      projection.otimista_venda_custos_manutencao = row.otimista_venda_custos_manutencao;
      
      // ADICIONAR CAMPOS DE COMISSÃO E CUSTOS ADICIONAIS - ESSENCIAL PARA CÁLCULOS DINÂMICOS
      projection.padrao_venda_comissao = row.padrao_venda_comissao;
      projection.conservador_venda_comissao = row.conservador_venda_comissao;
      projection.otimista_venda_comissao = row.otimista_venda_comissao;
      
      projection.padrao_venda_custos_adicionais = row.padrao_venda_custos_adicionais;
      projection.conservador_venda_custos_adicionais = row.conservador_venda_custos_adicionais;
      projection.otimista_venda_custos_adicionais = row.otimista_venda_custos_adicionais;
      
      projection.padrao_venda_impostos = row.padrao_venda_impostos;
      projection.conservador_venda_impostos = row.conservador_venda_impostos;
      projection.otimista_venda_impostos = row.otimista_venda_impostos;
      
      // Adicionar os campos específicos de taxa de valorização patrimonial
      projection.padrao_valorizacao_taxa_anual = row.padrao_valorizacao_taxa_anual;
      projection.conservador_valorizacao_taxa_anual = row.conservador_valorizacao_taxa_anual;
      projection.otimista_valorizacao_taxa_anual = row.otimista_valorizacao_taxa_anual;
      
      // Adicionar os campos de período para valorização patrimonial
      projection.padrao_valorizacao_periodo = row.padrao_valorizacao_periodo;
      projection.conservador_valorizacao_periodo = row.conservador_valorizacao_periodo;
      projection.otimista_valorizacao_periodo = row.otimista_valorizacao_periodo;
      
      // Adicionar os campos de aluguel mensal para cada cenário
      projection.padrao_aluguel_valor_mensal = row.padrao_aluguel_valor_mensal;
      projection.conservador_aluguel_valor_mensal = row.conservador_aluguel_valor_mensal;
      projection.otimista_aluguel_valor_mensal = row.otimista_aluguel_valor_mensal;
      
      // Adicionar os campos de taxa de ocupação para cada cenário
      projection.padrao_aluguel_ocupacao = row.padrao_aluguel_ocupacao;
      projection.conservador_aluguel_ocupacao = row.conservador_aluguel_ocupacao;
      projection.otimista_aluguel_ocupacao = row.otimista_aluguel_ocupacao;
      
      // Adicionar os campos de taxa de administração para cada cenário
      projection.padrao_aluguel_taxa_administracao = row.padrao_aluguel_taxa_administracao;
      projection.conservador_aluguel_taxa_administracao = row.conservador_aluguel_taxa_administracao;
      projection.otimista_aluguel_taxa_administracao = row.otimista_aluguel_taxa_administracao;
      
      // Adicionar os campos de custos de manutenção para aluguel em cada cenário
      projection.padrao_aluguel_manutencao = row.padrao_aluguel_manutencao;
      projection.conservador_aluguel_manutencao = row.conservador_aluguel_manutencao;
      projection.otimista_aluguel_manutencao = row.otimista_aluguel_manutencao;
      
      // Adicionar os campos de reajuste anual para cada cenário
      projection.padrao_aluguel_reajuste_anual = row.padrao_aluguel_reajuste_anual;
      projection.conservador_aluguel_reajuste_anual = row.conservador_aluguel_reajuste_anual;
      projection.otimista_aluguel_reajuste_anual = row.otimista_aluguel_reajuste_anual;
      
      console.log("DEBUG: Valores de aluguel mensal adicionados à projeção:", {
        padrao: projection.padrao_aluguel_valor_mensal,
        conservador: projection.conservador_aluguel_valor_mensal,
        otimista: projection.otimista_aluguel_valor_mensal
      });
      
      console.log("DEBUG: Valores de valorização adicionados à projeção:", {
        padrao_venda: projection.padrao_venda_valorizacao,
        conservador_venda: projection.conservador_venda_valorizacao,
        otimista_venda: projection.otimista_venda_valorizacao,
        padrao_valorizacao_taxa_anual: projection.padrao_valorizacao_taxa_anual,
        conservador_valorizacao_taxa_anual: projection.conservador_valorizacao_taxa_anual,
        otimista_valorizacao_taxa_anual: projection.otimista_valorizacao_taxa_anual
      });
      
      console.log("DEBUG: Valores de custos de manutenção adicionados à projeção:", {
        padrao: projection.padrao_venda_custos_manutencao,
        conservador: projection.conservador_venda_custos_manutencao,
        otimista: projection.otimista_venda_custos_manutencao
      });
      
      // LOG ESPECÍFICO PARA CAMPOS DE COMISSÃO E CUSTOS ADICIONAIS
      console.log("DEBUG: Campos de comissão e custos adicionais carregados:", {
        padrao_venda_comissao: projection.padrao_venda_comissao,
        conservador_venda_comissao: projection.conservador_venda_comissao,
        otimista_venda_comissao: projection.otimista_venda_comissao,
        padrao_venda_custos_adicionais: projection.padrao_venda_custos_adicionais,
        conservador_venda_custos_adicionais: projection.conservador_venda_custos_adicionais,
        otimista_venda_custos_adicionais: projection.otimista_venda_custos_adicionais,
        padrao_venda_impostos: projection.padrao_venda_impostos,
        conservador_venda_impostos: projection.conservador_venda_impostos,
        otimista_venda_impostos: projection.otimista_venda_impostos
      });
      
      // Buscar dados da propriedade relacionada, se existir
      if (projection.propertyId) {
        const property = await this.getProperty(projection.propertyId);
        if (property) {
          projection.property = property;
        }
      }
      
      // Buscar dados do cliente relacionado, se existir
      if (projection.clientId) {
        const client = await this.getClient(projection.clientId);
        if (client) {
          projection.client = client;
        }
      }
      
      // Buscar cálculos da projeção
      const calculos = await this.getCalculosProjecao(id);
      if (calculos && calculos.length > 0) {
        if (!projection.calculationResults) projection.calculationResults = {};
        projection.calculationResults.calculosProjecao = calculos;
      }
      
      return projection;
    } catch (error) {
      console.error("Error fetching projection:", error);
      return undefined;
    }
  }

  async createProjection(insertProjection: InsertProjection): Promise<Projection> {
    try {
      console.log("Inserindo projeção com dados:", JSON.stringify(insertProjection, null, 2));
      
      // Obter o próximo ID sequencial para este usuário
      const userSequentialId = await this.getNextProjectionSequentialId(insertProjection.userId);
      console.log(`Atribuindo ID sequencial ${userSequentialId} para o usuário ${insertProjection.userId}`);
      
      // Criar um objeto com mapeamento completo de nomes de colunas para nomes em português
      const columnMapping: Record<string, string> = {
        // Campos básicos
        'id': 'id', // Adicionar mapeamento para ID manual
        'userSequentialId': 'user_sequential_id',
        'title': 'titulo',
        'clientId': 'cliente_id',
        'propertyId': 'imovel_id',
        'strategies': 'estrategias',
        'userId': 'usuario_id',
        
        // Dados do imóvel
        'propertyName': 'nome_imovel',
        'propertyType': 'tipo_imovel',
        'propertyUnit': 'unidade_imovel',
        'propertyArea': 'area_imovel',
        'propertyDescription': 'descricao_imovel',
        
        // Endereço
        'address': 'endereco',
        'neighborhood': 'bairro',
        'city': 'cidade',
        'state': 'estado',
        'zipCode': 'cep',
        
        // Dados da compra
        'deliveryMonths': 'prazo_entrega',
        'deliveryTime': 'tempo_entrega',
        'listPrice': 'valor_tabela',
        'discount': 'valor_desconto',
        'downPayment': 'valor_entrada',
        'paymentMonths': 'prazo_pagamento',
        'monthlyCorrection': 'correcao_mensal',
        'correctionIndex': 'indice_correcao',
        'postDeliveryCorrection': 'correcao_apos_entrega',
        'postDeliveryCorrectionIndex': 'indice_correcao_apos_chaves',
        'includeBonusPayments': 'tem_reforcos',
        'bonusFrequency': 'frequencia_reforcos',
        'bonusValue': 'valor_reforco',
        'hasKeys': 'tem_chaves',
        'keysValue': 'valor_chaves',
        'tipoParcelamento': 'tipo_parcelamento',
        
        // Configuração de cenários
        'scenarioType': 'tipo_cenario',
        'activeScenario': 'cenario_ativo',
        'selectedScenarios': 'cenarios_selecionados',
        
        // Cenário Padrão - Venda Futura
        'padraoFutureSaleInvestmentPeriod': 'padrao_venda_prazo',
        'padraoFutureSaleAppreciationRate': 'padrao_venda_valorizacao',
        'padraoFutureSaleSellingExpenseRate': 'padrao_venda_comissao',
        'padraoFutureSaleIncomeTaxRate': 'padrao_venda_impostos',
        'padraoFutureSaleAdditionalCosts': 'padrao_venda_custos_adicionais',
        'padraoFutureSaleMaintenanceCosts': 'padrao_venda_custos_manutencao',
        
        // Cenário Padrão - Valorização
        'padraoAssetAppreciationAnnualRate': 'padrao_valorizacao_taxa_anual',
        'padraoAssetAppreciationAnalysisPeriod': 'padrao_valorizacao_periodo',
        'padraoAssetAppreciationMaintenanceCosts': 'padrao_valorizacao_manutencao',
        'padraoAssetAppreciationAnnualTaxes': 'padrao_valorizacao_impostos',
        
        // Cenário Padrão - Aluguel
        'padraoRentalYieldMonthlyRent': 'padrao_aluguel_valor_mensal',
        'padraoRentalYieldOccupancyRate': 'padrao_aluguel_ocupacao',
        'padraoRentalYieldManagementFee': 'padrao_aluguel_taxa_administracao',
        'padraoRentalYieldMaintenanceCosts': 'padrao_aluguel_manutencao',
        'padraoRentalYieldAnnualIncrease': 'padrao_aluguel_reajuste_anual',
        
        // Cenário Conservador - Venda Futura
        'conservadorFutureSaleInvestmentPeriod': 'conservador_venda_prazo',
        'conservadorFutureSaleAppreciationRate': 'conservador_venda_valorizacao',
        'conservadorFutureSaleSellingExpenseRate': 'conservador_venda_comissao',
        'conservadorFutureSaleIncomeTaxRate': 'conservador_venda_impostos',
        'conservadorFutureSaleAdditionalCosts': 'conservador_venda_custos_adicionais',
        'conservadorFutureSaleMaintenanceCosts': 'conservador_venda_custos_manutencao',
        
        // Cenário Conservador - Valorização
        'conservadorAssetAppreciationAnnualRate': 'conservador_valorizacao_taxa_anual',
        'conservadorAssetAppreciationAnalysisPeriod': 'conservador_valorizacao_periodo',
        'conservadorAssetAppreciationMaintenanceCosts': 'conservador_valorizacao_manutencao',
        'conservadorAssetAppreciationAnnualTaxes': 'conservador_valorizacao_impostos',
        
        // Cenário Conservador - Aluguel
        'conservadorRentalYieldMonthlyRent': 'conservador_aluguel_valor_mensal',
        'conservadorRentalYieldOccupancyRate': 'conservador_aluguel_ocupacao',
        'conservadorRentalYieldManagementFee': 'conservador_aluguel_taxa_administracao',
        'conservadorRentalYieldMaintenanceCosts': 'conservador_aluguel_manutencao',
        'conservadorRentalYieldAnnualIncrease': 'conservador_aluguel_reajuste_anual',
        
        // Cenário Otimista - Venda Futura
        'otimistaFutureSaleInvestmentPeriod': 'otimista_venda_prazo',
        'otimistaFutureSaleAppreciationRate': 'otimista_venda_valorizacao',
        'otimistaFutureSaleSellingExpenseRate': 'otimista_venda_comissao',
        'otimistaFutureSaleIncomeTaxRate': 'otimista_venda_impostos',
        'otimistaFutureSaleAdditionalCosts': 'otimista_venda_custos_adicionais',
        'otimistaFutureSaleMaintenanceCosts': 'otimista_venda_custos_manutencao',
        
        // Cenário Otimista - Valorização
        'otimistaAssetAppreciationAnnualRate': 'otimista_valorizacao_taxa_anual',
        'otimistaAssetAppreciationAnalysisPeriod': 'otimista_valorizacao_periodo',
        'otimistaAssetAppreciationMaintenanceCosts': 'otimista_valorizacao_manutencao',
        'otimistaAssetAppreciationAnnualTaxes': 'otimista_valorizacao_impostos',
        
        // Cenário Otimista - Aluguel
        'otimistaRentalYieldMonthlyRent': 'otimista_aluguel_valor_mensal',
        'otimistaRentalYieldOccupancyRate': 'otimista_aluguel_ocupacao',
        'otimistaRentalYieldManagementFee': 'otimista_aluguel_taxa_administracao',
        'otimistaRentalYieldMaintenanceCosts': 'otimista_aluguel_manutencao',
        'otimistaRentalYieldAnnualIncrease': 'otimista_aluguel_reajuste_anual',
        
        // Campos calculados
        'calculationResults': 'resultados_calculo',
        'createdAt': 'data_criacao',
        'updatedAt': 'data_atualizacao'
      };
      
      // Preparar dados específicos que precisam ser convertidos
      const preparedData = {
        ...insertProjection,
        // Adicionar o ID sequencial do usuário
        userSequentialId: userSequentialId,
        // Converter valores numericos para decimal string
        listPrice: String(insertProjection.listPrice || 0),
        downPayment: String(insertProjection.downPayment || 0),
        monthlyCorrection: String(insertProjection.monthlyCorrection || 0),
        discount: insertProjection.discount ? String(insertProjection.discount) : "0",
        // Assegurar que campos obrigatórios estejam presentes
        userId: insertProjection.userId || 1,
        // Converter campos que devem ser arrays
        strategies: Array.isArray(insertProjection.strategies) 
          ? insertProjection.strategies 
          : [insertProjection.strategies].filter(Boolean)
      };
      
      // Construir colunas e valores para inserção via SQL nativo
      // Filtrar apenas as colunas que têm valores definidos
      const validColumns = Object.keys(preparedData).filter(key => {
        return preparedData[key] !== undefined && columnMapping[key] !== undefined;
      });
      
      console.log("Colunas válidas:", validColumns);
      
      // Extrair os dados dos cenários se existirem
      const handleNestedScenarios = () => {
        // Mapear os campos dos cenários
        const scenarioMapping = {
          // Cenário Conservador - Venda Futura
          conservador: {
            futureSale: {
              investmentPeriod: 'conservador_venda_prazo',
              appreciationRate: 'conservador_venda_valorizacao',
              sellingExpenseRate: 'conservador_venda_comissao',
              incomeTaxRate: 'conservador_venda_impostos',
              additionalCosts: 'conservador_venda_custos_adicionais',
              maintenanceCosts: 'conservador_venda_custos_manutencao'
            },
            assetAppreciation: {
              annualRate: 'conservador_valorizacao_taxa_anual',
              analysisPeriod: 'conservador_valorizacao_periodo',
              maintenanceCosts: 'conservador_valorizacao_manutencao',
              annualTaxes: 'conservador_valorizacao_impostos'
            },
            rentalYield: {
              monthlyRent: 'conservador_aluguel_valor_mensal',
              occupancyRate: 'conservador_aluguel_ocupacao',
              managementFee: 'conservador_aluguel_taxa_administracao',
              maintenanceCosts: 'conservador_aluguel_manutencao',
              annualIncrease: 'conservador_aluguel_reajuste_anual'
            }
          },
          // Cenário Otimista - Venda Futura
          otimista: {
            futureSale: {
              investmentPeriod: 'otimista_venda_prazo',
              appreciationRate: 'otimista_venda_valorizacao',
              sellingExpenseRate: 'otimista_venda_comissao',
              incomeTaxRate: 'otimista_venda_impostos',
              additionalCosts: 'otimista_venda_custos_adicionais',
              maintenanceCosts: 'otimista_venda_custos_manutencao'
            },
            assetAppreciation: {
              annualRate: 'otimista_valorizacao_taxa_anual',
              analysisPeriod: 'otimista_valorizacao_periodo',
              maintenanceCosts: 'otimista_valorizacao_manutencao',
              annualTaxes: 'otimista_valorizacao_impostos'
            },
            rentalYield: {
              monthlyRent: 'otimista_aluguel_valor_mensal',
              occupancyRate: 'otimista_aluguel_ocupacao',
              managementFee: 'otimista_aluguel_taxa_administracao',
              maintenanceCosts: 'otimista_aluguel_manutencao',
              annualIncrease: 'otimista_aluguel_reajuste_anual'
            }
          }
        };

        // Verificar e extrair dados dos cenários conservador e otimista
        // @ts-ignore
        if (preparedData.conservador) {
          // @ts-ignore
          const conservador = preparedData.conservador;
          
          if (conservador.futureSale) {
            Object.entries(conservador.futureSale).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.conservador.futureSale[key]) {
                const columnName = scenarioMapping.conservador.futureSale[key];
                columnMapping[`conservador.futureSale.${key}`] = columnName;
                preparedData[`conservador.futureSale.${key}`] = value;
              }
            });
          }
          
          if (conservador.assetAppreciation) {
            Object.entries(conservador.assetAppreciation).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.conservador.assetAppreciation[key]) {
                const columnName = scenarioMapping.conservador.assetAppreciation[key];
                columnMapping[`conservador.assetAppreciation.${key}`] = columnName;
                preparedData[`conservador.assetAppreciation.${key}`] = value;
              }
            });
          }
          
          if (conservador.rentalYield) {
            Object.entries(conservador.rentalYield).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.conservador.rentalYield[key]) {
                const columnName = scenarioMapping.conservador.rentalYield[key];
                columnMapping[`conservador.rentalYield.${key}`] = columnName;
                preparedData[`conservador.rentalYield.${key}`] = value;
              }
            });
          }
        }
        
        // @ts-ignore
        if (preparedData.otimista) {
          // @ts-ignore
          const otimista = preparedData.otimista;
          
          if (otimista.futureSale) {
            Object.entries(otimista.futureSale).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.otimista.futureSale[key]) {
                const columnName = scenarioMapping.otimista.futureSale[key];
                columnMapping[`otimista.futureSale.${key}`] = columnName;
                preparedData[`otimista.futureSale.${key}`] = value;
              }
            });
          }
          
          if (otimista.assetAppreciation) {
            Object.entries(otimista.assetAppreciation).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.otimista.assetAppreciation[key]) {
                const columnName = scenarioMapping.otimista.assetAppreciation[key];
                columnMapping[`otimista.assetAppreciation.${key}`] = columnName;
                preparedData[`otimista.assetAppreciation.${key}`] = value;
              }
            });
          }
          
          if (otimista.rentalYield) {
            Object.entries(otimista.rentalYield).forEach(([key, value]) => {
              if (value !== undefined && scenarioMapping.otimista.rentalYield[key]) {
                const columnName = scenarioMapping.otimista.rentalYield[key];
                columnMapping[`otimista.rentalYield.${key}`] = columnName;
                preparedData[`otimista.rentalYield.${key}`] = value;
              }
            });
          }
        }
      };

      // Processar os cenários
      handleNestedScenarios();
      
      // Adicionar mapeamento direto dos campos de chaves para compatibilidade com nova rota
      columnMapping['tem_chaves'] = 'tem_chaves';
      columnMapping['valor_chaves'] = 'valor_chaves';
      
      // Atualizar as colunas válidas
      const updatedValidColumns = Object.keys(preparedData).filter(key => {
        return preparedData[key] !== undefined && columnMapping[key] !== undefined;
      });
      
      // Mapear colunas para nomes em português e seus valores
      const ptColumns: string[] = [];
      const ptValues: any[] = [];
      
      for (const colName of updatedValidColumns) {
        // Verificar se existe um mapeamento para esta coluna
        if (columnMapping[colName]) {
          ptColumns.push(columnMapping[colName]);
          let value = preparedData[colName];
          
          // Tratamento especial para JSONs
          if (colName === 'strategies' || colName === 'selectedScenarios' || colName === 'calculationResults') {
            value = JSON.stringify(value);
          }
          
          ptValues.push(value);
        }
      }
      
      console.log("Colunas PT para inserção:", ptColumns);
      console.log("Valores para inserção:", ptValues);
      
      // Para testes, vamos usar interpolação direta (não é seguro para produção)
      const valueStrings = ptValues.map(value => {
        if (value === null) return 'NULL';
        if (value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        // Para objetos ou arrays (JSON)
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        return `'${String(value)}'`;
      }).join(', ');
      
      // Verificar se um ID manual foi fornecido
      const hasManualId = preparedData.id !== undefined;
      let sqlQuery;
      
      if (hasManualId) {
        console.log(`Inserindo com ID manual: ${preparedData.id}`);
        // Para inserção com ID manual, usamos OVERRIDING SYSTEM VALUE
        sqlQuery = `
          INSERT INTO projections (${ptColumns.join(', ')}) 
          OVERRIDING SYSTEM VALUE
          VALUES (${valueStrings}) 
          RETURNING *
        `;
      } else {
        console.log("Inserindo com ID automático");
        sqlQuery = `INSERT INTO projections (${ptColumns.join(', ')}) VALUES (${valueStrings}) RETURNING *`;
      }
      
      console.log("Executando SQL:", sqlQuery);
      
      // Inserir no banco usando SQL nativo
      const result = await db.execute(sqlQuery);
      
      console.log("Resultado da inserção:", result.rows[0]);
      
      const projection = result.rows[0] as Projection;
      console.log("Projeção criada com sucesso:", projection);
      return projection;
    } catch (error: any) {
      console.error("Erro detalhado ao criar projeção:", error.message);
      console.error("Stack trace:", error.stack);
      console.error("Código SQL (se disponível):", error.query);
      throw error;
    }
  }

  async updateProjection(id: number, projectionData: Partial<Projection>): Promise<Projection | undefined> {
    try {
      const now = new Date();
      const preparedData = { ...projectionData, updatedAt: now };
      
      // Extrair os dados dos cenários
      const handleNestedScenariosForUpdate = () => {
        // @ts-ignore
        if (preparedData.conservador) {
          // @ts-ignore
          const conservador = preparedData.conservador;
          
          if (conservador.futureSale) {
            Object.entries(conservador.futureSale).forEach(([key, value]) => {
              preparedData[`conservador.futureSale.${key}`] = value;
            });
          }
          
          if (conservador.assetAppreciation) {
            Object.entries(conservador.assetAppreciation).forEach(([key, value]) => {
              preparedData[`conservador.assetAppreciation.${key}`] = value;
            });
          }
          
          if (conservador.rentalYield) {
            Object.entries(conservador.rentalYield).forEach(([key, value]) => {
              preparedData[`conservador.rentalYield.${key}`] = value;
            });
          }
          
          // Remover o objeto original para não interferir
          // @ts-ignore
          delete preparedData.conservador;
        }
        
        // @ts-ignore
        if (preparedData.otimista) {
          // @ts-ignore
          const otimista = preparedData.otimista;
          
          if (otimista.futureSale) {
            Object.entries(otimista.futureSale).forEach(([key, value]) => {
              preparedData[`otimista.futureSale.${key}`] = value;
            });
          }
          
          if (otimista.assetAppreciation) {
            Object.entries(otimista.assetAppreciation).forEach(([key, value]) => {
              preparedData[`otimista.assetAppreciation.${key}`] = value;
            });
          }
          
          if (otimista.rentalYield) {
            Object.entries(otimista.rentalYield).forEach(([key, value]) => {
              preparedData[`otimista.rentalYield.${key}`] = value;
            });
          }
          
          // Remover o objeto original para não interferir
          // @ts-ignore
          delete preparedData.otimista;
        }
      };
      
      // Processar os cenários aninhados
      handleNestedScenariosForUpdate();
      
      // Criar um objeto com mapeamento completo de nomes de colunas para nomes em português
      const columnMapping: Record<string, string> = {
        // Campos básicos
        'title': 'titulo',
        'clientId': 'cliente_id',
        'propertyId': 'imovel_id',
        'strategies': 'estrategias',
        'userId': 'usuario_id',
        
        // Dados do imóvel
        'propertyName': 'nome_imovel',
        'propertyType': 'tipo_imovel',
        'propertyUnit': 'unidade_imovel',
        'propertyArea': 'area_imovel',
        'propertyDescription': 'descricao_imovel',
        
        // Endereço
        'address': 'endereco',
        'neighborhood': 'bairro',
        'city': 'cidade',
        'state': 'estado',
        'zipCode': 'cep',
        
        // Dados da compra
        'deliveryMonths': 'prazo_entrega',
        'deliveryTime': 'tempo_entrega',
        'listPrice': 'valor_tabela',
        'discount': 'valor_desconto',
        'downPayment': 'valor_entrada',
        'paymentMonths': 'prazo_pagamento',
        'monthlyCorrection': 'correcao_mensal',
        'correctionIndex': 'indice_correcao',
        'postDeliveryCorrection': 'correcao_apos_entrega',
        'postDeliveryCorrectionIndex': 'indice_correcao_apos_chaves',
        'includeBonusPayments': 'tem_reforcos',
        'bonusFrequency': 'frequencia_reforcos',
        'bonusValue': 'valor_reforco',
        'hasKeys': 'tem_chaves',
        'keysValue': 'valor_chaves',
        
        // Configuração de cenários
        'scenarioType': 'tipo_cenario',
        'activeScenario': 'cenario_ativo',
        'selectedScenarios': 'cenarios_selecionados',
        
        // Cenário Padrão - Venda Futura
        'padraoFutureSaleInvestmentPeriod': 'padrao_venda_prazo',
        'padraoFutureSaleAppreciationRate': 'padrao_venda_valorizacao',
        'padraoFutureSaleSellingExpenseRate': 'padrao_venda_comissao',
        'padraoFutureSaleIncomeTaxRate': 'padrao_venda_impostos',
        'padraoFutureSaleAdditionalCosts': 'padrao_venda_custos_adicionais',
        'padraoFutureSaleMaintenanceCosts': 'padrao_venda_custos_manutencao',
        
        // Cenário Padrão - Valorização
        'padraoAssetAppreciationAnnualRate': 'padrao_valorizacao_taxa_anual',
        'padraoAssetAppreciationAnalysisPeriod': 'padrao_valorizacao_periodo',
        'padraoAssetAppreciationMaintenanceCosts': 'padrao_valorizacao_manutencao',
        'padraoAssetAppreciationAnnualTaxes': 'padrao_valorizacao_impostos',
        
        // Cenário Padrão - Aluguel
        'padraoRentalYieldMonthlyRent': 'padrao_aluguel_valor_mensal',
        'padraoRentalYieldOccupancyRate': 'padrao_aluguel_ocupacao',
        'padraoRentalYieldManagementFee': 'padrao_aluguel_taxa_administracao',
        'padraoRentalYieldMaintenanceCosts': 'padrao_aluguel_manutencao',
        'padraoRentalYieldAnnualIncrease': 'padrao_aluguel_reajuste_anual',
        
        // Cenário Conservador - Venda Futura
        'conservadorFutureSaleInvestmentPeriod': 'conservador_venda_prazo',
        'conservadorFutureSaleAppreciationRate': 'conservador_venda_valorizacao',
        'conservadorFutureSaleSellingExpenseRate': 'conservador_venda_comissao',
        'conservadorFutureSaleIncomeTaxRate': 'conservador_venda_impostos',
        'conservadorFutureSaleAdditionalCosts': 'conservador_venda_custos_adicionais',
        'conservadorFutureSaleMaintenanceCosts': 'conservador_venda_custos_manutencao',
        
        // Cenário Conservador - Valorização
        'conservadorAssetAppreciationAnnualRate': 'conservador_valorizacao_taxa_anual',
        'conservadorAssetAppreciationAnalysisPeriod': 'conservador_valorizacao_periodo',
        'conservadorAssetAppreciationMaintenanceCosts': 'conservador_valorizacao_manutencao',
        'conservadorAssetAppreciationAnnualTaxes': 'conservador_valorizacao_impostos',
        
        // Cenário Conservador - Aluguel
        'conservadorRentalYieldMonthlyRent': 'conservador_aluguel_valor_mensal',
        'conservadorRentalYieldOccupancyRate': 'conservador_aluguel_ocupacao',
        'conservadorRentalYieldManagementFee': 'conservador_aluguel_taxa_administracao',
        'conservadorRentalYieldMaintenanceCosts': 'conservador_aluguel_manutencao',
        'conservadorRentalYieldAnnualIncrease': 'conservador_aluguel_reajuste_anual',
        
        // Cenário Otimista - Venda Futura
        'otimistaFutureSaleInvestmentPeriod': 'otimista_venda_prazo',
        'otimistaFutureSaleAppreciationRate': 'otimista_venda_valorizacao',
        'otimistaFutureSaleSellingExpenseRate': 'otimista_venda_comissao',
        'otimistaFutureSaleIncomeTaxRate': 'otimista_venda_impostos',
        'otimistaFutureSaleAdditionalCosts': 'otimista_venda_custos_adicionais',
        'otimistaFutureSaleMaintenanceCosts': 'otimista_venda_custos_manutencao',
        
        // Cenário Otimista - Valorização
        'otimistaAssetAppreciationAnnualRate': 'otimista_valorizacao_taxa_anual',
        'otimistaAssetAppreciationAnalysisPeriod': 'otimista_valorizacao_periodo',
        'otimistaAssetAppreciationMaintenanceCosts': 'otimista_valorizacao_manutencao',
        'otimistaAssetAppreciationAnnualTaxes': 'otimista_valorizacao_impostos',
        
        // Cenário Otimista - Aluguel
        'otimistaRentalYieldMonthlyRent': 'otimista_aluguel_valor_mensal',
        'otimistaRentalYieldOccupancyRate': 'otimista_aluguel_ocupacao',
        'otimistaRentalYieldManagementFee': 'otimista_aluguel_taxa_administracao',
        'otimistaRentalYieldMaintenanceCosts': 'otimista_aluguel_manutencao',
        'otimistaRentalYieldAnnualIncrease': 'otimista_aluguel_reajuste_anual',
        
        // Campos calculados
        'calculationResults': 'resultados_calculo',
        'createdAt': 'data_criacao',
        'updatedAt': 'data_atualizacao'
      };
      
      // Construir conjunto de atualizações para SQL nativo
      const updates = Object.entries(preparedData)
        .filter(([key, value]) => value !== undefined && columnMapping[key] !== undefined)
        .map(([key, value]) => {
          // Mapear nome da coluna do TS para nome no banco - em português
          const colName = columnMapping[key] || key;
          
          // Tratar valores especiais
          if (key === 'strategies' || key === 'selectedScenarios' || key === 'calculationResults') {
            return `${colName} = '${JSON.stringify(value)}'::jsonb`;
          }
          
          // Para strings e outros valores
          if (typeof value === 'string') {
            return `${colName} = '${value.replace(/'/g, "''")}'`;
          }
          
          // Para datas
          if (value instanceof Date) {
            return `${colName} = '${value.toISOString()}'`;
          }
          
          // Para booleanos e números
          return `${colName} = ${value}`;
        })
        .join(', ');
      
      if (updates.length === 0) {
        console.log("Nenhum campo válido para atualizar");
        return await this.getProjection(id);
      }
      
      console.log(`Executando SQL: UPDATE projections SET ${updates} WHERE id = ${id} RETURNING *`);
      
      // Executar a atualização SQL diretamente - usando interpolação direta
      const sqlQuery = `UPDATE projections SET ${updates} WHERE id = ${id} RETURNING *`;
      console.log("SQL Query para atualização:", sqlQuery);
      const result = await db.execute(sqlQuery);
      
      if (result.rows.length === 0) return undefined;
      
      console.log("Resultado da atualização:", result.rows[0]);
      
      // Converter back para o formato de Projection
      return await this.getProjection(id);
    } catch (error) {
      console.error("Error updating projection:", error);
      return undefined;
    }
  }

  async deleteProjection(id: number): Promise<boolean> {
    try {
      console.log(`[STORAGE] Iniciando exclusão da projeção ID: ${id}`);
      
      // First delete associated transactions
      console.log(`[STORAGE] Deletando transações associadas...`);
      const transactionsDeleted = await this.deleteTransactionsByProjection(id);
      console.log(`[STORAGE] Transações deletadas: ${transactionsDeleted}`);
      
      // Delete associated calculoProjecoes
      console.log(`[STORAGE] Deletando cálculos associados...`);
      const calculosDeleted = await this.deleteCalculosByProjection(id);
      console.log(`[STORAGE] Cálculos deletados: ${calculosDeleted}`);
      
      // Then delete the projection using proper Drizzle syntax
      console.log(`[STORAGE] Deletando projeção principal...`);
      console.log(`[STORAGE] Usando tabela:`, typeof projections);
      console.log(`[STORAGE] Usando função eq:`, typeof eq);
      console.log(`[STORAGE] Database connection:`, typeof db);
      
      const result = await db
        .delete(projections)
        .where(eq(projections.id, id));
      
      console.log(`[STORAGE] Resultado da exclusão:`, result);
      console.log(`[STORAGE] Projeção ${id} deletada com sucesso`);
      return true;
    } catch (error) {
      console.error(`[STORAGE] Erro ao deletar projeção ${id}:`, error);
      console.error(`[STORAGE] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
      return false;
    }
  }

  // Transaction operations
  async getTransactions(projectionId: number): Promise<Transaction[]> {
    try {
      return await db
        .select()
        .from(transactions)
        .where(eq(transactions.projectionId, projectionId));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      const [transaction] = await db
        .insert(transactions)
        .values(insertTransaction)
        .returning();
      return transaction;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }

  async createTransactions(insertTransactions: InsertTransaction[]): Promise<Transaction[]> {
    try {
      if (insertTransactions.length === 0) return [];
      
      const createdTransactions = await db
        .insert(transactions)
        .values(insertTransactions)
        .returning();
      return createdTransactions;
    } catch (error) {
      console.error("Error creating transactions:", error);
      throw error;
    }
  }

  async deleteTransactionsByProjection(projectionId: number): Promise<boolean> {
    try {
      await db
        .delete(transactions)
        .where(eq(transactions.projectionId, projectionId));
      return true;
    } catch (error) {
      console.error("Error deleting transactions by projection:", error);
      return false;
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(users);
      return result;
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  }

  async getUsersWithProjectionCounts(): Promise<(User & { projectionCount: number })[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          company: users.company,
          photo: users.photo,
          isAdmin: users.isAdmin,
          lastActiveAt: users.lastActiveAt,
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
          subscriptionStatus: users.subscriptionStatus,
          subscriptionStartDate: users.subscriptionStartDate,
          subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
          subscriptionCanceledAt: users.subscriptionCanceledAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          projectionCount: sql<number>`COUNT(${projections.id})`.as('projection_count')
        })
        .from(users)
        .leftJoin(projections, eq(users.id, projections.userId))
        .groupBy(users.id);

      return result;
    } catch (error) {
      console.error("Error fetching users with projection counts:", error);
      return [];
    }
  }

  async updateUserLastActive(id: number): Promise<User | undefined> {
    try {
      const result = await db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating user last active:", error);
      return undefined;
    }
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    subscriptionsEndingSoon: number;
    usersOnlineNow: number;
  }> {
    try {
      const totalUsersResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users);

      const activeSubscriptionsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));

      const canceledSubscriptionsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.subscriptionStatus, 'canceled'));

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const subscriptionsEndingSoonResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(
          sql`${users.subscriptionCurrentPeriodEnd} <= ${sevenDaysFromNow} AND ${users.subscriptionStatus} = 'active'`
        );

      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const usersOnlineNowResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(sql`${users.lastActiveAt} >= ${tenMinutesAgo}`);

      return {
        totalUsers: totalUsersResult[0]?.count || 0,
        activeSubscriptions: activeSubscriptionsResult[0]?.count || 0,
        canceledSubscriptions: canceledSubscriptionsResult[0]?.count || 0,
        subscriptionsEndingSoon: subscriptionsEndingSoonResult[0]?.count || 0,
        usersOnlineNow: usersOnlineNowResult[0]?.count || 0,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return {
        totalUsers: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        subscriptionsEndingSoon: 0,
        usersOnlineNow: 0,
      };
    }
  }

  // Stripe Webhook Log operations
  async createStripeWebhookLog(log: InsertStripeWebhookLog): Promise<StripeWebhookLog> {
    try {
      const result = await db.insert(stripeWebhookLogs).values(log).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating stripe webhook log:", error);
      throw error;
    }
  }

  async getStripeWebhookLogs(limit = 50, type?: string): Promise<StripeWebhookLog[]> {
    try {
      let query = db
        .selectDistinct({
          id: stripeWebhookLogs.id,
          type: stripeWebhookLogs.type,
          statusCode: stripeWebhookLogs.statusCode,
          receivedAt: stripeWebhookLogs.receivedAt,
          bodyPreview: stripeWebhookLogs.bodyPreview,
          fullBody: stripeWebhookLogs.fullBody,
          handled: stripeWebhookLogs.handled,
          errorMessage: stripeWebhookLogs.errorMessage,
        })
        .from(stripeWebhookLogs);
      
      if (type) {
        query = query.where(eq(stripeWebhookLogs.type, type));
      }

      const result = await query
        .orderBy(sql`${stripeWebhookLogs.receivedAt} DESC`)
        .limit(limit);

      return result;
    } catch (error) {
      console.error("Error fetching stripe webhook logs:", error);
      return [];
    }
  }

  async getStripeWebhookLog(id: number): Promise<StripeWebhookLog | undefined> {
    try {
      const result = await db
        .select()
        .from(stripeWebhookLogs)
        .where(eq(stripeWebhookLogs.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching stripe webhook log:", error);
      return undefined;
    }
  }

  async updateStripeWebhookLog(id: number, log: Partial<StripeWebhookLog>): Promise<StripeWebhookLog | undefined> {
    try {
      const result = await db
        .update(stripeWebhookLogs)
        .set(log)
        .where(eq(stripeWebhookLogs.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating stripe webhook log:", error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
