/**
 * Calculadora da TIR (Taxa Interna de Retorno) conforme o modelo do Excel
 * 
 * Este arquivo contém as funções necessárias para calcular a TIR de acordo
 * com a solicitação de compatibilidade exata com o Excel.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { db } = require('../db');
import { sql } from 'drizzle-orm';

/**
 * Interface para os dados necessários para o cálculo da TIR
 */
export interface DadosTIR {
  valorTabela: number;
  prazoVenda: number;
  valorizacaoAnual: number;
  comissao: number;
  custosAdicionais: number;
  custosManutencao: number;
  valorEntrada: number;
  saldoDevedorNoMesVenda: number;
  pagamentosMensais: {
    mes: number;
    pagamentoTotal: number;
  }[];
  scenario?: string; // Adicionamos o cenário para facilitar o debug
}

/**
 * Busca os dados necessários para o cálculo da TIR
 * @param projectionId ID da projeção
 * @param scenario Cenário (padrao, conservador, otimista)
 * @returns Dados necessários para o cálculo da TIR
 */
export async function buscarDadosParaTIR(projectionId: number, scenario: string = 'padrao'): Promise<DadosTIR> {
  try {
    // Verificar e ajustar o cenário
    let scenarioAdaptado = scenario;
    if (scenario === 'realistic') scenarioAdaptado = 'padrao';
    if (scenario === 'conservative') scenarioAdaptado = 'conservador';
    if (scenario === 'optimistic') scenarioAdaptado = 'otimista';
    
    console.log("buscarDadosParaTIR: Iniciando busca de dados", { projectionId, scenario: scenarioAdaptado });
    
    // 1. Buscar dados da projeção com SQL direto (mais confiável)
    const projecaoQuery = await db.query(`
      SELECT * FROM projections WHERE id = $1
    `, [projectionId]);
    
    if (!projecaoQuery.rows || projecaoQuery.rows.length === 0) {
      throw new Error(`Projeção ${projectionId} não encontrada`);
    }
    
    console.log("buscarDadosParaTIR: Projeção encontrada", { projecaoId: projectionId });
    
    const projecao = projecaoQuery.rows[0];
    
    // Extrair e validar dados da projeção
    // Log detalhado da resposta para debug
    console.log("buscarDadosParaTIR: Resposta da consulta:", projecao);
    
    // Nomes das colunas no formato snake_case como estão no banco
    const valorTabela = parseFloat(String(projecao.valor_tabela || '0'));
    const valorEntrada = parseFloat(String(projecao.valor_entrada || '0'));
    
    // Definir nomes das colunas para o cenário
    const prazoVendaColuna = `${scenarioAdaptado}_venda_prazo`;
    const valorizacaoColuna = `${scenarioAdaptado}_venda_valorizacao`;
    const comissaoColuna = `${scenarioAdaptado}_venda_comissao`;
    const custosAdicionaisColuna = `${scenarioAdaptado}_venda_custos_adicionais`;
    const custosManutencaoColuna = `${scenarioAdaptado}_venda_custos_manutencao`;
    
    // Log dos nomes das colunas para debug
    console.log("buscarDadosParaTIR: Colunas do cenário:", {
      prazoVendaColuna,
      valorizacaoColuna,
      comissaoColuna,
      custosAdicionaisColuna,
      custosManutencaoColuna
    });
    
    // Acessar valores usando notação de string
    const prazoVenda = parseInt(String(projecao[prazoVendaColuna] || '0'));
    const valorizacaoAnual = parseFloat(String(projecao[valorizacaoColuna] || '0'));
    const comissao = parseFloat(String(projecao[comissaoColuna] || '0'));
    const custosAdicionais = parseFloat(String(projecao[custosAdicionaisColuna] || '0'));
    const custosManutencao = parseFloat(String(projecao[custosManutencaoColuna] || '0'));
    
    // Validar dados críticos
    if (prazoVenda <= 0) {
      throw new Error(`Prazo de venda inválido (${prazoVenda}) para projeção ${projectionId}`);
    }
    
    if (valorTabela <= 0) {
      throw new Error(`Valor de tabela inválido (${valorTabela}) para projeção ${projectionId}`);
    }
    
    console.log("buscarDadosParaTIR: Dados da projeção encontrados", {
      valorTabela,
      valorEntrada,
      prazoVenda,
      valorizacaoAnual,
      comissao,
      custosAdicionais,
      custosManutencao
    });
    
    // 2. Buscar os pagamentos mensais da tabela calculo_projecoes com SQL direto
    // Sempre buscamos do cenário padrão (pois é o único que existe no banco)
    const calculosQuery = await db.query(`
      SELECT mes, pagamento_total, saldo_devedor_corrigido
      FROM calculo_projecoes
      WHERE 
        projection_id = $1 AND
        (scenario = 'padrao' OR scenario IS NULL)
      ORDER BY mes ASC
    `, [projectionId]);
    
    // Se não encontrar nenhum cálculo, lança erro
    if (!calculosQuery.rows || calculosQuery.rows.length === 0) {
      throw new Error(`Não foram encontrados cálculos para a projeção ${projectionId}`);
    }
    
    console.log("buscarDadosParaTIR: Cálculos encontrados:", calculosQuery.rows.length);
    
    // Processar os cálculos para obter o saldo devedor no mês da venda
    let calculoMesVenda = calculosQuery.rows.find(c => parseInt(String(c.mes)) === prazoVenda);
    
    // Se não encontrar cálculo específico para o mês da venda, buscar o cálculo mais próximo
    if (!calculoMesVenda) {
      console.log(`buscarDadosParaTIR: Não foi encontrado cálculo para o mês exato da venda (${prazoVenda}), buscando o mais próximo`);
      
      // Pegar todos os meses disponíveis
      const mesesDisponiveis = calculosQuery.rows.map(c => parseInt(String(c.mes))).sort((a, b) => a - b);
      console.log(`buscarDadosParaTIR: Meses disponíveis:`, mesesDisponiveis);
      
      // Encontrar o mês mais próximo (provavelmente o último disponível)
      let mesProximo = null;
      
      // Se o mês da venda é maior que o último disponível, usa o último
      if (prazoVenda > mesesDisponiveis[mesesDisponiveis.length - 1]) {
        mesProximo = mesesDisponiveis[mesesDisponiveis.length - 1];
      } 
      // Se o mês da venda é menor que o primeiro disponível, usa o primeiro
      else if (prazoVenda < mesesDisponiveis[0]) {
        mesProximo = mesesDisponiveis[0];
      }
      // Caso contrário, encontra o mês mais próximo
      else {
        for (let i = 0; i < mesesDisponiveis.length - 1; i++) {
          if (mesesDisponiveis[i] <= prazoVenda && prazoVenda <= mesesDisponiveis[i + 1]) {
            // Escolhe o mês mais próximo
            if (prazoVenda - mesesDisponiveis[i] <= mesesDisponiveis[i + 1] - prazoVenda) {
              mesProximo = mesesDisponiveis[i];
            } else {
              mesProximo = mesesDisponiveis[i + 1];
            }
            break;
          }
        }
      }
      
      // Se encontrou um mês próximo, usa o cálculo desse mês
      if (mesProximo !== null) {
        calculoMesVenda = calculosQuery.rows.find(c => parseInt(String(c.mes)) === mesProximo);
        console.log(`buscarDadosParaTIR: Usando cálculo do mês ${mesProximo} como aproximação para o mês da venda ${prazoVenda}`);
      } else {
        throw new Error(`Não foi possível encontrar um cálculo próximo para o mês da venda (${prazoVenda}) na projeção ${projectionId}`);
      }
    }
    
    const saldoDevedorNoMesVenda = parseFloat(String(calculoMesVenda.saldo_devedor_corrigido || '0'));
    
    // Montar array de pagamentos mensais
    const pagamentosMensais = calculosQuery.rows.map(c => ({
      mes: parseInt(String(c.mes)),
      pagamentoTotal: parseFloat(String(c.pagamento_total || '0'))
    }));
    
    // Retornar dados consolidados
    const dadosTIR: DadosTIR = {
      valorTabela,
      prazoVenda,
      valorizacaoAnual,
      comissao,
      custosAdicionais,
      custosManutencao,
      valorEntrada,
      saldoDevedorNoMesVenda,
      pagamentosMensais,
      scenario: scenarioAdaptado // Incluir cenário para debug
    };
    
    console.log("buscarDadosParaTIR: Dados consolidados", {
      valorTabela,
      prazoVenda,
      pagamentosMensais: pagamentosMensais.length,
      saldoDevedorNoMesVenda
    });
    
    return dadosTIR;
    
  } catch (error) {
    console.error("buscarDadosParaTIR: Erro ao buscar dados para TIR", error);
    throw error;
  }
}

/**
 * Monta o fluxo de caixa para cálculo da TIR
 * @param dados Dados para cálculo da TIR
 * @returns Array de fluxo de caixa
 */
export function montarFluxoCaixaParaTIR(dados: DadosTIR): number[] {
  // Criar o array com tamanho exato (prazoVenda + 1)
  const cashFlow = new Array(dados.prazoVenda + 1).fill(0);
  
  // Colocar a entrada no mês 0 (negativa, pois é saída de caixa)
  cashFlow[0] = -dados.valorEntrada;
  
  // Adicionar cada pagamento mensal (todos negativos)
  dados.pagamentosMensais.forEach(pagamento => {
    // Os pagamentos são incluídos apenas até o mês da venda
    if (pagamento.mes < dados.prazoVenda) {
      cashFlow[pagamento.mes] = -pagamento.pagamentoTotal;
    }
  });
  
  // Calcular valor da venda projetada no mês da venda
  // Este é um ponto crítico: cada cenário tem sua própria taxa de valorização anual
  const anos = dados.prazoVenda / 12;
  const valorVendaProjetada = dados.valorTabela * Math.pow(1 + dados.valorizacaoAnual / 100, anos);
  
  // Calcular despesas da venda - também específicas para cada cenário
  const comissaoVenda = valorVendaProjetada * (dados.comissao / 100);
  const custosAdicionaisVenda = valorVendaProjetada * (dados.custosAdicionais / 100);
  
  // Valor líquido no mês da venda (receita - despesas)
  // Usamos o saldo devedor no mês específico de venda para cada cenário
  cashFlow[dados.prazoVenda] = valorVendaProjetada - 
                           dados.saldoDevedorNoMesVenda - 
                           comissaoVenda - 
                           custosAdicionaisVenda - 
                           dados.custosManutencao;
  
  console.log("montarFluxoCaixaParaTIR: Fluxo de caixa montado", { 
    scenario: dados.scenario || 'N/A', // Adicionar cenário para debug
    prazoVenda: dados.prazoVenda,
    valorizacaoAnual: dados.valorizacaoAnual,
    tamanho: cashFlow.length,
    fluxo: cashFlow,
    valorVendaProjetada,
    comissaoVenda,
    custosAdicionaisVenda,
    custosManutencao: dados.custosManutencao,
    saldoDevedorNoMesVenda: dados.saldoDevedorNoMesVenda,
    valorLiquidoFinal: cashFlow[dados.prazoVenda]
  });
  
  return cashFlow;
}

/**
 * Calcula a TIR (Taxa Interna de Retorno) usando o método de Newton-Raphson
 * - Implementa um método mais robusto com múltiplas tentativas iniciais quando o método padrão falha
 * @param cashflows Array de fluxo de caixa
 * @param maxIterations Número máximo de iterações
 * @param precision Precisão desejada
 * @returns TIR em formato decimal (0.0141 para 1,41% ao mês)
 */
export function calculateIRR(cashflows: number[], maxIterations = 1000, precision = 0.000001): number {
  // Validar o fluxo de caixa
  // Deve haver pelo menos uma alteração de sinal no fluxo de caixa para TIR ter solução
  let hasPositive = false;
  let hasNegative = false;
  
  for (const flow of cashflows) {
    if (flow > 0) hasPositive = true;
    if (flow < 0) hasNegative = true;
    
    // Se já encontramos fluxos positivos e negativos, temos uma mudança de sinal
    if (hasPositive && hasNegative) break;
  }
  
  // Se não houver alteração de sinal, TIR não tem solução real
  if (!hasPositive || !hasNegative) {
    console.log("calculateIRR: Fluxo de caixa não possui alteração de sinal, TIR indefinida", {
      hasPositive,
      hasNegative,
      flows: cashflows
    });
    
    // Em vez de retornar um valor padrão, tentaremos um método alternativo
    return calculateIRRBisection(cashflows);
  }
  
  // Lista de palpites iniciais para tentar se o método padrão falhar
  const initialGuesses = [0.1, 0.05, 0.2, 0.01, 0.3, 0.5, -0.5, 0];
  
  // Tentar calcular com diferentes valores iniciais
  for (const initialGuess of initialGuesses) {
    const result = tryCalculateIRR(cashflows, initialGuess, maxIterations, precision);
    
    // Se encontrou um resultado válido
    if (result !== null) {
      return result;
    }
  }
  
  // Se todas as tentativas falharam, usar o método de bisseção (mais lento mas mais robusto)
  console.log("calculateIRR: Todas as tentativas com Newton-Raphson falharam, usando método de bisseção");
  return calculateIRRBisection(cashflows);
}

/**
 * Tenta calcular a TIR com um valor inicial específico usando o método de Newton-Raphson
 */
function tryCalculateIRR(cashflows: number[], initialGuess: number, maxIterations: number, precision: number): number | null {
  let guess = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    const npv = cashflows.reduce((sum, cashflow, index) => {
      return sum + cashflow / Math.pow(1 + guess, index);
    }, 0);

    // Se NPV está próximo de zero, encontramos a solução
    if (Math.abs(npv) < precision) {
      console.log(`calculateIRR: Convergência bem-sucedida com palpite inicial ${initialGuess}`, {
        guess,
        npv,
        iteration: i
      });
      return guess;
    }

    // Calcular a derivada da função NPV
    const derivativeNPV = cashflows.reduce((sum, cashflow, index) => {
      return sum - (index * cashflow) / Math.pow(1 + guess, index + 1);
    }, 0);
    
    // Evitar divisão por zero ou valor muito pequeno
    if (Math.abs(derivativeNPV) < 1e-10) {
      console.log(`calculateIRR: Derivada próxima de zero com palpite inicial ${initialGuess}`, {
        npv,
        derivativeNPV,
        iteration: i
      });
      return null; // Sinaliza que esta tentativa falhou
    }

    // Método de Newton-Raphson
    const nextGuess = guess - npv / derivativeNPV;
    
    // Verificar se a estimativa divergiu ou não está convergindo
    if (!isFinite(nextGuess) || isNaN(nextGuess)) {
      console.log(`calculateIRR: Estimativa divergiu com palpite inicial ${initialGuess}`, {
        npv,
        derivativeNPV,
        guess,
        nextGuess,
        iteration: i
      });
      return null; // Sinaliza que esta tentativa falhou
    }
    
    // Verificar se a taxa é absurdamente baixa
    if (nextGuess < -0.99) {
      console.log(`calculateIRR: Taxa muito baixa com palpite inicial ${initialGuess}`, {
        nextGuess,
        iteration: i
      });
      return null; // Sinaliza que esta tentativa falhou
    }
    
    // Verificar se a taxa é absurdamente alta
    if (nextGuess > 5) { // 500% ao mês é um limite razoável
      console.log(`calculateIRR: Taxa muito alta com palpite inicial ${initialGuess}`, {
        nextGuess,
        iteration: i
      });
      return null; // Sinaliza que esta tentativa falhou
    }
    
    // Atualizar o palpite para a próxima iteração
    guess = nextGuess;
  }

  // Se chegou aqui, não convergiu dentro do número máximo de iterações
  console.log(`calculateIRR: Não convergiu com palpite inicial ${initialGuess}`, {
    maxIterations,
    finalGuess: guess
  });
  
  return null; // Sinaliza que esta tentativa falhou
}

/**
 * Método de bisseção para calcular a TIR - mais lento, mas mais robusto
 * Este método é usado como fallback quando o método de Newton-Raphson falha
 */
function calculateIRRBisection(cashflows: number[]): number {
  // Definir limites de busca para a TIR
  let lowerBound = -0.99; // -99% é o mínimo teórico (-100% não faz sentido matemático)
  let upperBound = 5.0;   // 500% ao mês como máximo razoável
  
  // Calcular NPV para os limites
  const npvLower = calculateNPV(cashflows, lowerBound);
  const npvUpper = calculateNPV(cashflows, upperBound);
  
  // Verificar se há uma solução no intervalo (sinais opostos)
  if (Math.sign(npvLower) === Math.sign(npvUpper)) {
    console.log("calculateIRRBisection: Não há raiz no intervalo definido", {
      lowerBound,
      upperBound,
      npvLower,
      npvUpper
    });
    
    // Neste caso, usamos uma heurística e retornamos o valor com NPV mais próximo de zero
    return Math.abs(npvLower) < Math.abs(npvUpper) ? lowerBound : upperBound;
  }
  
  // Precisão desejada
  const precision = 0.0000001;
  
  // Número máximo de iterações
  const maxIterations = 100;
  
  // Método de bisseção
  for (let i = 0; i < maxIterations; i++) {
    // Calcular ponto médio
    const middleRate = (lowerBound + upperBound) / 2;
    
    // Calcular NPV para o ponto médio
    const npvMiddle = calculateNPV(cashflows, middleRate);
    
    // Verificar se atingimos a precisão desejada
    if (Math.abs(npvMiddle) < precision || (upperBound - lowerBound) < precision) {
      console.log("calculateIRRBisection: Convergência atingida", {
        rate: middleRate,
        npv: npvMiddle,
        iteration: i
      });
      return middleRate;
    }
    
    // Ajustar os limites com base no sinal do NPV
    if (Math.sign(npvMiddle) === Math.sign(npvLower)) {
      lowerBound = middleRate;
    } else {
      upperBound = middleRate;
    }
  }
  
  // Se chegou aqui, retornar o ponto médio como aproximação
  const result = (lowerBound + upperBound) / 2;
  
  console.log("calculateIRRBisection: Usada aproximação após máximo de iterações", {
    result,
    lowerBound,
    upperBound
  });
  
  return result;
}

/**
 * Calcula o Valor Presente Líquido (NPV) para um fluxo de caixa e uma taxa
 */
function calculateNPV(cashflows: number[], rate: number): number {
  return cashflows.reduce((sum, cashflow, index) => {
    return sum + cashflow / Math.pow(1 + rate, index);
  }, 0);
}

/**
 * Calcula a TIR para uma projeção e cenário específicos
 * @param projectionId ID da projeção
 * @param scenario Cenário (padrao, conservador, otimista)
 * @returns TIR mensal em formato decimal (0.0141 para 1,41% ao mês)
 */
export async function calcularTIRExcel(projectionId: number, scenario: string = 'padrao'): Promise<number> {
  try {
    // 1. Buscar os dados necessários
    const dados = await buscarDadosParaTIR(projectionId, scenario);
    
    // 2. Montar o fluxo de caixa
    const cashFlow = montarFluxoCaixaParaTIR(dados);
    
    // 3. Calcular a TIR
    const tirMensal = calculateIRR(cashFlow);
    
    console.log("calcularTIRExcel: TIR calculada", {
      projectionId,
      scenario,
      tirMensal,
      tirMensalPercentual: (tirMensal * 100).toFixed(2) + '%',
      tirAnual: (((1 + tirMensal) ** 12) - 1) * 100
    });
    
    return tirMensal;
  } catch (error) {
    console.error("calcularTIRExcel: Erro ao calcular TIR", error);
    throw error;
  }
}

/**
 * Calcula a TIR para projeção 92 (exemplo específico)
 * @returns Resultado do cálculo específico para a projeção 92
 */
export async function exemploProjecao92(): Promise<{
  tirMensal: number;
  tirAnual: number;
  fluxoCaixa: number[];
  detalhes: {
    valorTabela: number;
    prazoVenda: number;
    valorizacaoAnual: number;
    comissao: number;
    custosAdicionais: number;
    valorVendaProjetada: number;
    saldoDevedorNoMesVenda: number;
    despesasVenda: number;
    valorLiquidoFinal: number;
  };
}> {
  try {
    // Buscar dados para projeção 92, cenário padrão
    const dados = await buscarDadosParaTIR(92, 'padrao');
    
    // Montar fluxo de caixa
    const cashFlow = montarFluxoCaixaParaTIR(dados);
    
    // Calcular a TIR
    const tirMensal = calculateIRR(cashFlow);
    const tirAnual = ((1 + tirMensal) ** 12) - 1;
    
    // Calcular detalhes adicionais para o exemplo
    const anos = dados.prazoVenda / 12;
    const valorVendaProjetada = dados.valorTabela * Math.pow(1 + dados.valorizacaoAnual / 100, anos);
    const comissaoVenda = valorVendaProjetada * (dados.comissao / 100);
    const custosAdicionaisVenda = valorVendaProjetada * (dados.custosAdicionais / 100);
    const despesasVenda = comissaoVenda + custosAdicionaisVenda + dados.custosManutencao;
    const valorLiquidoFinal = valorVendaProjetada - dados.saldoDevedorNoMesVenda - despesasVenda;
    
    return {
      tirMensal,
      tirAnual,
      fluxoCaixa: cashFlow,
      detalhes: {
        valorTabela: dados.valorTabela,
        prazoVenda: dados.prazoVenda,
        valorizacaoAnual: dados.valorizacaoAnual,
        comissao: dados.comissao,
        custosAdicionais: dados.custosAdicionais,
        valorVendaProjetada,
        saldoDevedorNoMesVenda: dados.saldoDevedorNoMesVenda,
        despesasVenda,
        valorLiquidoFinal
      }
    };
  } catch (error) {
    console.error("exemploProjecao92: Erro ao calcular exemplo", error);
    throw error;
  }
}