import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { eq, and, desc } from 'drizzle-orm';
import { financialIndexes, type IndexType } from '@shared/schema';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { db } = require('../db');

interface InccData {
  month: string;
  monthlyVariation: number;
  yearAccumulated: number;
  twelveMonthAccumulated: number;
}

class InccService {
  private readonly SOURCE_URL = 'https://sindusconpr.com.br/incc-m-fgv-1364-p';
  private readonly SOURCE_NAME = 'sinduscon-pr';

  /**
   * Executa o scraping da página do Sinduscon-PR para coletar dados do INCC-M usando Cheerio
   */
  async scrapeInccData(): Promise<InccData[]> {
    // Redirecionar para o método HTTP com Cheerio
    return this.scrapeInccDataWithCheerio();
  }

  /**
   * Método antigo que usava Puppeteer (desabilitado)
   */
  async scrapeInccDataOld(): Promise<InccData[]> {
    console.log('[INCC] Iniciando scraping dos dados do INCC-M...');
    
    try {
      console.log(`[INCC] Fazendo requisição HTTP para: ${this.SOURCE_URL}`);
      
      const response = await axios.get(this.SOURCE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      console.log(`[INCC] Página carregada com sucesso. Status: ${response.status}`);
      
      const $ = cheerio.load(response.data);
      const processedData: InccData[] = [];
      
      // Buscar tabelas na página
      const tables = $('table');
      console.log(`[INCC] Encontradas ${tables.length} tabelas na página`);
      
      let dataFound = false;
      
      tables.each((index, tableElement) => {
        const tableText = $(tableElement).text();
        
        // Verificar se a tabela contém dados do INCC
        if (tableText.includes('INCC') || tableText.includes('%') || tableText.includes('Mensal') || tableText.includes('Mês')) {
          console.log(`[INCC] Tabela ${index + 1} parece conter dados do INCC`);
          
          const rows = $(tableElement).find('tr');
          
          rows.each((rowIndex, rowElement) => {
            if (rowIndex === 0) return; // Pular cabeçalho
            
            const cells = $(rowElement).find('td, th');
            
            if (cells.length >= 2) {
              const monthText = $(cells[0]).text().trim();
              const monthlyVar = $(cells[1]).text().trim();
              
              // Tentar extrair mais colunas se existirem
              const yearAcc = cells.length > 2 ? $(cells[2]).text().trim() : '';
              const twelveMonthAcc = cells.length > 3 ? $(cells[3]).text().trim() : '';
              
              if (monthText && monthlyVar && (monthlyVar.includes('%') || monthlyVar.match(/[\d,.-]+/))) {
                const monthFormatted = this.parseMonthYear(monthText);
                
                if (monthFormatted) {
                  const monthlyVariation = this.parsePercentage(monthlyVar);
                  
                  // Só adicionar se conseguirmos extrair um valor válido
                  if (!isNaN(monthlyVariation) && monthlyVariation !== 0) {
                    processedData.push({
                      month: monthFormatted,
                      monthlyVariation,
                      yearAccumulated: this.parsePercentage(yearAcc),
                      twelveMonthAccumulated: this.parsePercentage(twelveMonthAcc)
                    });
                    
                    console.log(`[INCC] Dados extraídos: ${monthFormatted} = ${monthlyVariation}%`);
                    dataFound = true;
                  }
                }
              }
            }
          });
        }
      });
      
      // Se não encontrou dados nas tabelas, tentar buscar em outros elementos
      if (!dataFound) {
        console.log('[INCC] Não encontrou dados em tabelas, tentando busca em outros elementos...');
        
        // Buscar por elementos que contenham padrões de mês/ano e porcentagem
        const textElements = $('*').contents().filter(function() {
          return this.nodeType === 3; // Text nodes
        });
        
        textElements.each((index, element) => {
          const text = $(element).text().trim();
          
          // Buscar padrões como "Janeiro/2024 0,45%" ou "Jan 2024: 0.45%"
          const matches = text.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\/\s-]*(\d{4})[:\s]*([+-]?\d+[,.]?\d*)\s*%/gi);
          
          if (matches) {
            matches.forEach(match => {
              const parts = match.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\/\s-]*(\d{4})[:\s]*([+-]?\d+[,.]?\d*)\s*%/i);
              
              if (parts) {
                const monthText = `${parts[1]} ${parts[2]}`;
                const monthFormatted = this.parseMonthYear(monthText);
                const monthlyVariation = this.parsePercentage(parts[3]);
                
                if (monthFormatted && !isNaN(monthlyVariation)) {
                  processedData.push({
                    month: monthFormatted,
                    monthlyVariation,
                    yearAccumulated: 0,
                    twelveMonthAccumulated: 0
                  });
                  
                  console.log(`[INCC] Dados extraídos (texto): ${monthFormatted} = ${monthlyVariation}%`);
                  dataFound = true;
                }
              }
            });
          }
        });
      }
      
      if (processedData.length === 0) {
        console.log('[INCC] Nenhum dado foi encontrado. Conteúdo da página:');
        console.log(response.data.substring(0, 1000) + '...');
        throw new Error('Nenhum dado do INCC foi encontrado na página');
      }
      
      // Ordenar por data (mais recente primeiro) e pegar apenas os últimos 12 meses
      const sortedData = processedData
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
      
      console.log(`[INCC] Dados extraídos com sucesso: ${sortedData.length} registros dos últimos 12 meses`);
      return sortedData;
      
    } catch (error) {
      console.error('[INCC] Erro durante o scraping:', error);
      throw new Error(`Erro ao fazer scraping do INCC: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Converte texto de mês/ano para formato YYYY-MM
   */
  private parseMonthYear(monthText: string): string | null {
    if (!monthText) return null;
    
    // Mapear nomes de meses em português (mantendo acentos e case insensitive)
    const monthMap: Record<string, string> = {
      'janeiro': '01', 'jan': '01',
      'fevereiro': '02', 'fev': '02',
      'março': '03', 'mar': '03',
      'abril': '04', 'abr': '04',
      'maio': '05', 'mai': '05',
      'junho': '06', 'jun': '06',
      'julho': '07', 'jul': '07',
      'agosto': '08', 'ago': '08',
      'setembro': '09', 'set': '09',
      'outubro': '10', 'out': '10',
      'novembro': '11', 'nov': '11',
      'dezembro': '12', 'dez': '12'
    };
    
    // Primeiro tentar formato Mês/YYYY (formato do site)
    const monthYearMatch = monthText.match(/^([a-záêç]+)\/(\d{4})$/i);
    if (monthYearMatch) {
      const monthName = monthYearMatch[1].toLowerCase();
      const year = monthYearMatch[2];
      
      const monthNum = monthMap[monthName];
      if (monthNum) {
        return `${year}-${monthNum}`;
      }
    }
    
    // Tentar formato MM/YYYY ou MM-YYYY
    const dateMatch = monthText.match(/(\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const year = dateMatch[2];
      return `${year}-${month}`;
    }
    
    // Tentar formato com espaço (Janeiro 2025)
    const spaceMatch = monthText.match(/^([a-záêç]+)\s+(\d{4})$/i);
    if (spaceMatch) {
      const monthName = spaceMatch[1].toLowerCase();
      const year = spaceMatch[2];
      
      const monthNum = monthMap[monthName];
      if (monthNum) {
        return `${year}-${monthNum}`;
      }
    }
    
    return null;
  }

  /**
   * Converte texto de porcentagem para número decimal
   */
  private parsePercentage(percentText: string): number {
    if (!percentText) return 0;
    
    // Remover símbolos e espaços, manter apenas números, vírgula, ponto e sinal negativo
    const clean = percentText.replace(/[^\d,.\-]/g, '');
    
    // Converter vírgula para ponto (padrão brasileiro)
    const normalized = clean.replace(',', '.');
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Salva os dados do INCC no banco de dados
   */
  async saveInccData(data: InccData[]): Promise<void> {
    console.log(`[INCC] Salvando ${data.length} registros no banco...`);
    
    for (const record of data) {
      try {
        // Verificar se já existe registro para este mês
        const existing = await db
          .select()
          .from(inccIndexes)
          .where(
            and(
              eq(inccIndexes.month, record.month),
              eq(inccIndexes.indexType, 'incc')
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Inserir novo registro
          const insertData: InsertInccIndex = {
            indexType: 'incc',
            month: record.month,
            value: record.monthlyVariation.toString(),
            source: this.SOURCE_NAME
          };

          await db.insert(inccIndexes).values(insertData);
          console.log(`[INCC] Inserido: ${record.month} = ${record.monthlyVariation}%`);
        } else {
          console.log(`[INCC] Já existe: ${record.month}`);
        }
      } catch (error) {
        console.error(`[INCC] Erro ao salvar ${record.month}:`, error);
      }
    }
  }

  /**
   * Executa coleta completa do INCC
   */
  async collectInccData(): Promise<{ success: boolean; message: string; recordsProcessed: number }> {
    try {
      console.log('[INCC] Iniciando coleta do INCC-M...');
      
      // Usar apenas método HTTP com Cheerio (sem Puppeteer)
      const scrapedData = await this.scrapeInccData();
      
      if (scrapedData.length === 0) {
        return {
          success: false,
          message: 'Nenhum dado foi encontrado no scraping',
          recordsProcessed: 0
        };
      }

      // Filtrar apenas os últimos 12 meses para evitar dados muito antigos
      const sortedData = scrapedData
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);

      await this.saveInccData(sortedData);
      
      console.log('[INCC] Coleta concluída com sucesso');
      return {
        success: true,
        message: `Coleta do INCC concluída com sucesso. ${sortedData.length} registros processados.`,
        recordsProcessed: sortedData.length
      };
      
    } catch (error) {
      console.error('[INCC] Erro na coleta:', error);
      return {
        success: false,
        message: `Erro na coleta do INCC: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        recordsProcessed: 0
      };
    }
  }

  /**
   * Método exclusivo com Cheerio para scraping HTTP
   */
  async scrapeInccDataWithCheerio(): Promise<InccData[]> {
    console.log('[INCC] Iniciando scraping HTTP com Cheerio...');
    
    try {
      console.log(`[INCC] Fazendo requisição HTTP para: ${this.SOURCE_URL}`);
      
      const response = await axios.get(this.SOURCE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      console.log(`[INCC] Página carregada com sucesso. Status: ${response.status}`);
      
      const $ = cheerio.load(response.data);
      const processedData: InccData[] = [];
      
      // Buscar tabelas na página
      const tables = $('table');
      console.log(`[INCC] Encontradas ${tables.length} tabelas na página`);
      
      let dataFound = false;
      
      tables.each((index: any, tableElement: any) => {
        const tableText = $(tableElement).text();
        const tableHtml = $(tableElement).html();
        
        // Verificar se a tabela contém dados do INCC
        if (tableText.includes('INCC') || tableText.includes('%') || tableText.includes('Mensal') || tableText.includes('Mês')) {
          console.log(`[INCC] Tabela ${index + 1} parece conter dados do INCC`);
          console.log(`[INCC] HTML da tabela ${index + 1}:`, tableHtml?.substring(0, 500));
          
          const rows = $(tableElement).find('tr');
          console.log(`[INCC] Encontradas ${rows.length} linhas na tabela ${index + 1}`);
          
          rows.each((rowIndex: any, rowElement: any) => {
            const cells = $(rowElement).find('td');
            console.log(`[INCC] Linha ${rowIndex + 1}: ${cells.length} células`);
            
            if (cells.length > 0) {
              const cellTexts = [];
              for (let i = 0; i < cells.length; i++) {
                cellTexts.push($(cells[i]).text().trim());
              }
              console.log(`[INCC] Conteúdo da linha ${rowIndex + 1}:`, cellTexts);
            }
            
            // Procurar por linhas com dados mensais válidos
            if (cells.length >= 5) {
              const monthText = $(cells[0]).text().trim();
              const monthlyVarText = $(cells[2]).text().trim(); // Coluna "No mês (%)"
              const yearAccText = $(cells[3]).text().trim(); // Coluna "No ano (%)"
              const twelveMonthAccText = $(cells[4]).text().trim(); // Coluna "12 meses (%)"
              
              console.log(`[INCC] Analisando linha: mês="${monthText}", mensal="${monthlyVarText}", ano="${yearAccText}", 12m="${twelveMonthAccText}"`);
              
              // Debug da validação
              console.log(`[INCC] Validação: monthText="${monthText}" (${!!monthText}), monthlyVarText="${monthlyVarText}" (${!!monthlyVarText})`);
              console.log(`[INCC] Validação: includes '/'=${monthText.includes('/')}, includes 2024=${monthText.includes('2024')}, includes 2025=${monthText.includes('2025')}`);
              
              // Verificar se temos dados válidos do INCC
              if (monthText && monthlyVarText && 
                  (monthText.includes('/') && (monthText.includes('2024') || monthText.includes('2025')))) {
                
                console.log(`[INCC] Dados válidos encontrados para ${monthText}: ${monthlyVarText}`);
                
                try {
                  const monthFormatted = this.parseMonthYear(monthText);
                  console.log(`[INCC] parseMonthYear resultado: ${monthFormatted}`);
                
                  if (monthFormatted) {
                    const monthlyVariation = this.parsePercentage(monthlyVarText);
                    const yearAccumulated = this.parsePercentage(yearAccText);
                    const twelveMonthAccumulated = this.parsePercentage(twelveMonthAccText);
                    
                    console.log(`[INCC] parsePercentage resultados: monthly=${monthlyVariation}, year=${yearAccumulated}, 12m=${twelveMonthAccumulated}`);
                    
                    // Só adicionar se conseguirmos extrair um valor válido
                    if (!isNaN(monthlyVariation)) {
                      processedData.push({
                        month: monthFormatted,
                        monthlyVariation,
                        yearAccumulated,
                        twelveMonthAccumulated
                      });
                      
                      console.log(`[INCC] Dados extraídos: ${monthFormatted} = ${monthlyVariation}% (ano: ${yearAccumulated}%, 12m: ${twelveMonthAccumulated}%)`);
                      dataFound = true;
                    }
                  }
                } catch (error) {
                  console.error(`[INCC] Erro no parsing: ${error}`);
                }
              }
            }
          });
        }
      });
      
      // Se não encontrou dados nas tabelas, tentar buscar em outros elementos
      if (!dataFound) {
        console.log('[INCC] Não encontrou dados em tabelas, tentando busca em outros elementos...');
        
        // Buscar por elementos que contenham padrões de mês/ano e porcentagem
        const textElements = $('*').contents().filter(function(this: any) {
          return this.nodeType === 3; // Text nodes
        });
        
        textElements.each((index: any, element: any) => {
          const text = $(element).text().trim();
          
          // Buscar padrões como "Janeiro/2024 0,45%" ou "Jan 2024: 0.45%"
          const matches = text.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\/\s-]*(\d{4})[:\s]*([+-]?\d+[,.]?\d*)\s*%/gi);
          
          if (matches) {
            matches.forEach((match: any) => {
              const parts = match.match(/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[\/\s-]*(\d{4})[:\s]*([+-]?\d+[,.]?\d*)\s*%/i);
              
              if (parts) {
                const monthText = `${parts[1]} ${parts[2]}`;
                const monthFormatted = this.parseMonthYear(monthText);
                const monthlyVariation = this.parsePercentage(parts[3]);
                
                if (monthFormatted && !isNaN(monthlyVariation)) {
                  processedData.push({
                    month: monthFormatted,
                    monthlyVariation,
                    yearAccumulated: 0,
                    twelveMonthAccumulated: 0
                  });
                  
                  console.log(`[INCC] Dados extraídos (texto): ${monthFormatted} = ${monthlyVariation}%`);
                  dataFound = true;
                }
              }
            });
          }
        });
      }
      
      if (processedData.length === 0) {
        console.log('[INCC] Nenhum dado foi encontrado. Conteúdo da página:');
        console.log(response.data.substring(0, 1000) + '...');
        throw new Error('Nenhum dado do INCC foi encontrado na página');
      }
      
      // Ordenar por data (mais recente primeiro) e pegar apenas os últimos 12 meses
      const sortedData = processedData
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
      
      console.log(`[INCC] Dados extraídos com sucesso: ${sortedData.length} registros dos últimos 12 meses`);
      return sortedData;
      
    } catch (error) {
      console.error('[INCC] Erro durante o scraping HTTP:', error);
      throw new Error(`Erro ao fazer scraping do INCC: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca os últimos 12 meses de dados do INCC
   */
  async getLastTwelveMonths(): Promise<Array<{ month: string; value: string; createdAt: string }>> {
    const data = await db
      .select({
        month: inccIndexes.month,
        value: inccIndexes.value,
        createdAt: inccIndexes.createdAt
      })
      .from(inccIndexes)
      .where(eq(inccIndexes.indexType, 'incc'))
      .orderBy(desc(inccIndexes.month))
      .limit(12);

    return data.map(item => ({
      month: item.month,
      value: item.value,
      createdAt: item.createdAt.toISOString()
    }));
  }

  /**
   * Calcula a média dos últimos 12 meses do INCC
   */
  async getAverageLastTwelveMonths(): Promise<number | null> {
    const data = await this.getLastTwelveMonths();
    
    if (data.length === 0) {
      return null;
    }

    const sum = data.reduce((acc, item) => acc + parseFloat(item.value), 0);
    return sum / data.length;
  }

  /**
   * Busca o último registro do INCC
   */
  async getLastRecord(): Promise<{ month: string; value: string } | null> {
    const data = await db
      .select({
        month: inccIndexes.month,
        value: inccIndexes.value
      })
      .from(inccIndexes)
      .where(eq(inccIndexes.indexType, 'incc'))
      .orderBy(desc(inccIndexes.month))
      .limit(1);

    return data.length > 0 ? data[0] : null;
  }
}

export const inccService = new InccService();