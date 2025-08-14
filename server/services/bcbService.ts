import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { db } = require('../db');
import { financialIndexes, selicMeta, selicAcumulada, type IndexType } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Configuração dos índices do Banco Central
const BCB_INDICES = {
  ipca: 433,   // IPCA mensal
  igpm: 189,   // IGP-M mensal (código correto com dados atuais)
  selic_acumulada: 1178, // Taxa Selic acumulada anual - código 1178
  selic_meta: 432, // Taxa Selic meta anual (COPOM)
  cdi: 4392    // Taxa do CDI acumulada no ano
} as const;

// Interface para resposta da API do BCB
interface BCBResponse {
  data: string; // formato: "01/06/2024"
  valor: string; // valor como string, ex: "0.38"
}

export class BCBService {
  /**
   * Busca dados de um índice específico da API do BCB
   */
  async fetchIndexData(codigo: number, limit: number = 12): Promise<BCBResponse[]> {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${limit}?formato=json`;
    
    try {
      console.log(`[BCB Service] Buscando dados (código ${codigo}, últimos ${limit} registros)...`);
      const response = await axios.get<BCBResponse[]>(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RoiMob/1.0',
        }
      });
      
      console.log(`[BCB Service] Dados obtidos: ${response.data.length} registros`);
      return response.data;
    } catch (error) {
      console.error(`[BCB Service] Erro ao buscar dados (código ${codigo}):`, error);
      throw new Error(`Falha ao buscar dados do índice (código ${codigo})`);
    }
  }



  /**
   * Converte data do formato BCB (DD/MM/YYYY) para formato de mês (YYYY-MM)
   */
  private convertDateToMonth(bcbDate: string): string {
    const [day, month, year] = bcbDate.split('/');
    return `${year}-${month.padStart(2, '0')}`;
  }

  /**
   * Salva ou atualiza um índice no banco de dados (operação idempotente)
   */
  async saveIndexData(indexType: IndexType, month: string, value: number, valueMonthly?: number, valueAnnualEquivalent?: number): Promise<void> {
    try {
      // Verifica se o registro já existe
      const existing = await db
        .select()
        .from(financialIndexes)
        .where(
          and(
            eq(financialIndexes.indexType, indexType),
            eq(financialIndexes.month, month)
          )
        )
        .limit(1);

      const updateData: any = { value: value.toString() };
      if (valueMonthly !== undefined) {
        updateData.valueMonthly = valueMonthly.toString();
      }
      if (valueAnnualEquivalent !== undefined) {
        updateData.valueAnnualEquivalent = valueAnnualEquivalent.toString();
      }

      if (existing.length > 0) {
        console.log(`[BCB Service] Índice ${indexType.toUpperCase()} para ${month} já existe. Atualizando...`);
        // Atualiza o valor existente
        await db
          .update(financialIndexes)
          .set(updateData)
          .where(
            and(
              eq(financialIndexes.indexType, indexType),
              eq(financialIndexes.month, month)
            )
          );
      } else {
        console.log(`[BCB Service] Inserindo novo índice ${indexType.toUpperCase()} para ${month}...`);
        // Insere novo registro
        const insertData: any = {
          indexType,
          month,
          value: value.toString()
        };
        if (valueMonthly !== undefined) {
          insertData.valueMonthly = valueMonthly.toString();
        }
        if (valueAnnualEquivalent !== undefined) {
          insertData.valueAnnualEquivalent = valueAnnualEquivalent.toString();
        }
        
        await db.insert(financialIndexes).values(insertData);
      }
    } catch (error) {
      console.error(`[BCB Service] Erro ao salvar índice ${indexType} para ${month}:`, error);
      throw error;
    }
  }

  /**
   * Calcula a taxa anual equivalente a partir da taxa mensal
   * Fórmula: taxa_anual = ((1 + taxa_mensal/100)^12 - 1) * 100
   */
  private calculateAnnualEquivalent(monthlyRate: number): number {
    return (Math.pow(1 + monthlyRate / 100, 12) - 1) * 100;
  }

  /**
   * Processa e salva dados de um índice específico
   */
  async processIndexData(indexType: IndexType): Promise<number> {
    try {
      let processedCount = 0;

      // Para outros índices (IPCA, IGP-M, CDI), processar normalmente
      const codigo = BCB_INDICES[indexType];
      const data = await this.fetchIndexData(codigo, 12);
      console.log(`[BCB Service] Coletados ${data.length} registros de ${indexType.toUpperCase()}`);
      
      for (const item of data) {
        const month = this.convertDateToMonth(item.data);
        const value = parseFloat(item.valor);
        
        if (isNaN(value)) {
          console.warn(`[BCB Service] Valor inválido para ${indexType} em ${month}: ${item.valor}`);
          continue;
        }

        await this.saveIndexData(indexType, month, value);
        processedCount++;
      }

      console.log(`[BCB Service] Processados ${processedCount} registros para ${indexType.toUpperCase()}`);
      return processedCount;
    } catch (error) {
      console.error(`[BCB Service] Erro ao processar índice ${indexType}:`, error);
      throw error;
    }
  }

  /**
   * Executa a coleta de todos os índices econômicos
   */
  async collectAllIndices(): Promise<{ [key: string]: number }> {
    const results: { [key: string]: number } = {};
    const indices: IndexType[] = ['ipca', 'igpm', 'cdi'];

    console.log('[BCB Service] Iniciando coleta de todos os índices econômicos...');

    for (const indexType of indices) {
      try {
        const processedCount = await this.processIndexData(indexType);
        results[indexType] = processedCount;
      } catch (error) {
        console.error(`[BCB Service] Falha ao coletar ${indexType}:`, error);
        results[indexType] = 0;
      }
    }

    // Coleta separada da SELIC meta (apenas valor atual)
    try {
      console.log(`[BCB Service] Buscando SELIC meta (código ${BCB_INDICES.selic_meta})...`);
      
      const selicMetaData = await this.fetchIndexData(BCB_INDICES.selic_meta, 1); // Apenas 1 registro
      if (selicMetaData && selicMetaData.length > 0) {
        const latestValue = parseFloat(selicMetaData[0].valor);
        await this.saveSelicMeta(latestValue);
        console.log(`[BCB Service] SELIC meta atualizada: ${latestValue}%`);
      }
    } catch (error) {
      console.error('[BCB Service] Erro ao processar SELIC meta:', error);
    }

    // Coleta separada da SELIC acumulada (código 1178 - apenas valor mais recente)
    try {
      console.log(`[BCB Service] Buscando SELIC acumulada (código ${BCB_INDICES.selic_acumulada})...`);
      
      const selicAcumuladaData = await this.fetchIndexData(BCB_INDICES.selic_acumulada, 1); // Apenas 1 registro
      if (selicAcumuladaData && selicAcumuladaData.length > 0) {
        const latestData = selicAcumuladaData[0];
        const latestValue = parseFloat(latestData.valor);
        const referenceDate = this.convertBcbDateToStandard(latestData.data);
        
        await this.saveSelicAcumulada(latestValue, referenceDate);
        results['selic_acumulada'] = 1;
        console.log(`[BCB Service] SELIC acumulada atualizada: ${latestValue}% (${referenceDate})`);
      }
    } catch (error) {
      console.error('[BCB Service] Erro ao processar SELIC acumulada:', error);
      results['selic_acumulada'] = 0;
    }

    console.log('[BCB Service] Coleta finalizada:', results);
    return results;
  }

  /**
   * Calcula a média dos últimos 12 meses de um índice
   */
  async getAverageLastTwelveMonths(indexType: IndexType): Promise<number | null> {
    try {
      const data = await db
        .select()
        .from(financialIndexes)
        .where(eq(financialIndexes.indexType, indexType))
        .orderBy(desc(financialIndexes.month))
        .limit(12);

      if (data.length === 0) {
        return null;
      }

      const sum = data.reduce((acc, item) => acc + parseFloat(item.value), 0);
      return sum / data.length;
    } catch (error) {
      console.error(`[BCB Service] Erro ao calcular média para ${indexType}:`, error);
      return null;
    }
  }

  /**
   * Obtém os últimos 12 meses de dados de um índice
   */
  async getLastTwelveMonths(indexType: IndexType) {
    try {
      return await db
        .select()
        .from(financialIndexes)
        .where(eq(financialIndexes.indexType, indexType))
        .orderBy(desc(financialIndexes.month))
        .limit(12);
    } catch (error) {
      console.error(`[BCB Service] Erro ao buscar dados dos últimos 12 meses para ${indexType}:`, error);
      return [];
    }
  }

  /**
   * Obtém a taxa SELIC meta atual
   */
  async getSelicMeta() {
    try {
      const result = await db
        .select()
        .from(selicMeta)
        .orderBy(desc(selicMeta.updatedAt))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[BCB Service] Erro ao buscar SELIC meta:', error);
      return null;
    }
  }

  /**
   * Salva ou atualiza a taxa SELIC meta
   */
  async saveSelicMeta(value: number) {
    try {
      // Verifica se já existe um registro
      const existing = await db
        .select()
        .from(selicMeta)
        .limit(1);

      if (existing.length > 0) {
        console.log('[BCB Service] Atualizando SELIC meta existente...');
        await db
          .update(selicMeta)
          .set({ 
            value: value.toString(),
            updatedAt: new Date()
          })
          .where(eq(selicMeta.id, existing[0].id));
      } else {
        console.log('[BCB Service] Inserindo nova SELIC meta...');
        await db.insert(selicMeta).values({
          value: value.toString()
        });
      }
    } catch (error) {
      console.error('[BCB Service] Erro ao salvar SELIC meta:', error);
      throw error;
    }
  }

  /**
   * Converte data do formato BCB (DD/MM/YYYY) para formato padrão (YYYY-MM-DD)
   */
  private convertBcbDateToStandard(bcbDate: string): string {
    const [day, month, year] = bcbDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  /**
   * Obtém a taxa SELIC acumulada atual
   */
  async getSelicAcumulada() {
    try {
      const result = await db
        .select()
        .from(selicAcumulada)
        .orderBy(desc(selicAcumulada.createdAt))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[BCB Service] Erro ao buscar SELIC acumulada:', error);
      return null;
    }
  }

  /**
   * Salva ou atualiza a taxa SELIC acumulada
   */
  async saveSelicAcumulada(value: number, referenceDate: string) {
    try {
      // Verifica se já existe um registro para a mesma data de referência
      const existing = await db
        .select()
        .from(selicAcumulada)
        .where(eq(selicAcumulada.referenceDate, referenceDate))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[BCB Service] Atualizando SELIC acumulada existente para ${referenceDate}...`);
        await db
          .update(selicAcumulada)
          .set({ 
            valueAnnual: value.toString(),
            createdAt: new Date()
          })
          .where(eq(selicAcumulada.id, existing[0].id));
      } else {
        console.log(`[BCB Service] Inserindo nova SELIC acumulada para ${referenceDate}...`);
        await db.insert(selicAcumulada).values({
          indexType: 'selic_acumulada',
          referenceDate: referenceDate,
          valueAnnual: value.toString()
        });
      }
    } catch (error) {
      console.error('[BCB Service] Erro ao salvar SELIC acumulada:', error);
      throw error;
    }
  }

  /**
   * Coleta e salva dados da SELIC acumulada usando SGS código 1178
   */
  async processSelicAcumulada(): Promise<number> {
    try {
      console.log('[BCB Service] Iniciando coleta SELIC acumulada (SGS 1178)...');
      
      // Busca apenas o valor mais recente (limit=1)
      const response = await this.fetchIndexData(1178, 1);
      
      if (!response || response.length === 0) {
        console.log('[BCB Service] Nenhum dado SELIC acumulada encontrado');
        return 0;
      }

      const data = response[0];
      const value = parseFloat(data.valor);
      const referenceDate = this.convertBcbDateToStandard(data.data);

      console.log(`[BCB Service] SELIC acumulada: ${value}% em ${referenceDate}`);

      // Salva o valor mais recente
      await this.saveSelicAcumulada(value, referenceDate);

      return 1;
    } catch (error) {
      console.error('[BCB Service] Erro ao processar SELIC acumulada:', error);
      return 0;
    }
  }
}

export const bcbService = new BCBService();