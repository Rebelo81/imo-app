import * as cron from 'node-cron';
import { bcbService } from './bcbService';
import { inccService } from './inccService';
import { cubScServiceNew } from './cubScService_new';

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Inicia o scheduler para coleta automática de índices econômicos
   */
  start() {
    // Job para executar no dia 10 de cada mês às 09:00
    // Cron pattern: "0 9 10 * *" = minuto 0, hora 9, dia 10, qualquer mês, qualquer dia da semana
    const monthlyJob = cron.schedule('0 9 10 * *', async () => {
      console.log('[Scheduler] Iniciando coleta mensal de índices econômicos...');
      try {
        const bcbResults = await bcbService.collectAllIndices();
        const inccResults = await inccService.collectInccData();
        const cubScResults = await cubScServiceNew.collectCubScData();
        console.log('[Scheduler] Coleta mensal concluída:', { bcb: bcbResults, incc: inccResults, cubSc: cubScResults });
      } catch (error) {
        console.error('[Scheduler] Erro na coleta mensal:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    // Job para executar uma vez por semana (segunda-feira às 08:00) como backup
    // Cron pattern: "0 8 * * 1" = minuto 0, hora 8, qualquer dia, qualquer mês, segunda-feira
    const weeklyJob = cron.schedule('0 8 * * 1', async () => {
      console.log('[Scheduler] Executando coleta semanal de backup...');
      try {
        const bcbResults = await bcbService.collectAllIndices();
        const inccResults = await inccService.collectInccData();
        const cubScResults = await cubScServiceNew.collectCubScData();
        console.log('[Scheduler] Coleta semanal concluída:', { bcb: bcbResults, incc: inccResults, cubSc: cubScResults });
      } catch (error) {
        console.error('[Scheduler] Erro na coleta semanal:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.set('monthly', monthlyJob);
    this.jobs.set('weekly', weeklyJob);

    console.log('[Scheduler] Jobs de coleta de índices iniciados:');
    console.log('  - Coleta mensal: todo dia 10 às 09:00');
    console.log('  - Coleta semanal: toda segunda-feira às 08:00');
  }

  /**
   * Para todos os jobs do scheduler
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[Scheduler] Job ${name} parado`);
    });
    this.jobs.clear();
  }

  /**
   * Executa coleta manual de índices (para testes ou uso administrativo)
   */
  async runManualCollection(): Promise<{ [key: string]: any }> {
    console.log('[Scheduler] Executando coleta manual...');
    try {
      const bcbResults = await bcbService.collectAllIndices();
      const inccResults = await inccService.collectInccData();
      const cubScResults = await cubScServiceNew.collectCubScData();
      
      const results = {
        bcb: bcbResults,
        incc: inccResults,
        cubSc: cubScResults
      };
      
      console.log('[Scheduler] Coleta manual concluída:', results);
      return results;
    } catch (error) {
      console.error('[Scheduler] Erro na coleta manual:', error);
      throw error;
    }
  }

  /**
   * Obtém status dos jobs do scheduler
   */
  getStatus() {
    const status: { [key: string]: boolean } = {};
    this.jobs.forEach((job, name) => {
      status[name] = job.running;
    });
    return {
      jobs: status,
      totalJobs: this.jobs.size,
      timezone: 'America/Sao_Paulo'
    };
  }
}

export const scheduler = new SchedulerService();