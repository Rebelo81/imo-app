/**
 * Adaptador para chamar o serviço de cálculo de financiamento em Python
 */

// Usar os mesmos tipos, mas agora a implementação será da versão corrigida
import { FinanciamentoPlantaInput, ResultadoFinanciamentoPlanta } from "./formulasFinanciamentoPlanta";
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { log } from '../vite';

// Porta para o serviço Python
const PYTHON_PORT = 5002;
const PYTHON_API_URL = `http://localhost:${PYTHON_PORT}/api/calcular-financiamento`;

// Variável para controlar o estado do servidor Python
let pythonServerProcess: any = null;
let serverStarting = false;

/**
 * Inicia o servidor Python para cálculos
 */
export async function startPythonServer(): Promise<void> {
  if (pythonServerProcess || serverStarting) {
    return; // Já está iniciando ou rodando
  }

  serverStarting = true;
  
  try {
    log("Iniciando servidor Python para cálculos...", "python");
    
    // Define o caminho para o script Python
    const pythonScriptPath = path.join(process.cwd(), 'server', 'calculators', 'financiamento_api.py');
    
    // Spawna um processo Python
    pythonServerProcess = spawn('python3', [pythonScriptPath], {
      env: { ...process.env, PYTHON_API_PORT: PYTHON_PORT.toString() },
      stdio: 'pipe'
    });
    
    // Loga saída padrão
    pythonServerProcess.stdout.on('data', (data: Buffer) => {
      log(`[Python]: ${data.toString().trim()}`, "python");
    });
    
    // Loga erros
    pythonServerProcess.stderr.on('data', (data: Buffer) => {
      log(`[Python ERROR]: ${data.toString().trim()}`, "python");
    });
    
    // Gerencia encerramento
    pythonServerProcess.on('close', (code: number) => {
      log(`Servidor Python encerrou com código ${code}`, "python");
      pythonServerProcess = null;
      serverStarting = false;
    });
    
    // Aguarda um tempo para o servidor iniciar
    await new Promise(resolve => setTimeout(resolve, 2000));
    log("Servidor Python iniciado com sucesso!", "python");
  } catch (error) {
    log(`Erro ao iniciar servidor Python: ${error}`, "python");
    pythonServerProcess = null;
    serverStarting = false;
    throw error;
  }
}

/**
 * Para o servidor Python
 */
export function stopPythonServer(): void {
  if (pythonServerProcess) {
    log("Parando servidor Python...", "python");
    pythonServerProcess.kill();
    pythonServerProcess = null;
  }
}

/**
 * Calcula o financiamento na planta usando o serviço Python
 */
export async function calcularFinanciamentoPlantaPython(input: FinanciamentoPlantaInput): Promise<ResultadoFinanciamentoPlanta> {
  // Garante que o servidor Python esteja rodando
  if (!pythonServerProcess && !serverStarting) {
    await startPythonServer();
  }
  
  try {
    // Faz a chamada para o serviço Python
    log(`Enviando dados para cálculo Python: ${JSON.stringify(input, null, 2)}`, "python");
    
    const response = await axios.post(PYTHON_API_URL, input);
    
    if (response.status !== 200) {
      throw new Error(`Erro na resposta do servidor Python: ${response.statusText}`);
    }
    
    log("Cálculo Python concluído com sucesso!", "python");
    
    // Logar primeiro os dados que são mais importantes para a verificação
    const resultado = response.data as ResultadoFinanciamentoPlanta;
    
    // Logar o saldo líquido para cada mês para verificação
    if (resultado.parcelas && resultado.parcelas.length > 0) {
      log("------- VERIFICAÇÃO DOS SALDOS LÍQUIDOS -------", "python");
      
      resultado.parcelas.forEach((parcela, index) => {
        if (index === 0) {
          // Mês 0 deve ter saldo líquido null
          log(`Mês ${parcela.mes}: Saldo Líquido = ${parcela.saldoLiquido}`, "python");
        } 
        else if (index === 1) {
          // Mês 1 deve ser Valor Imóvel - Entrada - Desconto
          log(`Mês ${parcela.mes}: Saldo Líquido = ${parcela.saldoLiquido} (Valor do imóvel - entrada - desconto)`, "python");
        }
        else {
          // Mês 2+ deve ser Saldo Líquido Anterior - Pagamento Anterior
          const parcelaAnterior = resultado.parcelas[index - 1];
          log(`Mês ${parcela.mes}: Saldo Líquido = ${parcela.saldoLiquido} (${parcelaAnterior.saldoLiquido} - ${parcelaAnterior.valorBase} = ${parcelaAnterior.saldoLiquido - parcelaAnterior.valorBase})`, "python");
        }
      });
      log("-------------------------------------------", "python");
    }
    
    return resultado;
  } catch (error: any) {
    log(`Erro ao chamar o serviço Python: ${error.message}`, "python");
    if (error.response) {
      log(`Resposta de erro: ${JSON.stringify(error.response.data)}`, "python");
    }
    throw error;
  }
}