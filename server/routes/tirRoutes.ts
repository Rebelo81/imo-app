/**
 * Rotas para cálculo da TIR (Taxa Interna de Retorno)
 */
import { Router, Request, Response } from 'express';
import { calcularTIRExcel, exemploProjecao92, buscarDadosParaTIR, montarFluxoCaixaParaTIR } from '../calculators/tirCalculator';

const router = Router();

/**
 * Calcula a TIR para uma projeção e cenário específicos
 * GET /api/tir/calcular?projectionId=92&scenario=padrao
 */
router.get('/calcular', async (req: Request, res: Response) => {
  try {
    const projectionId = parseInt(String(req.query.projectionId || '0'));
    const scenario = String(req.query.scenario || 'padrao');
    
    if (!projectionId) {
      return res.status(400).json({ 
        error: 'ID da projeção não fornecido', 
        details: 'É necessário fornecer o parâmetro projectionId' 
      });
    }
    
    const tirMensal = await calcularTIRExcel(projectionId, scenario);
    const tirAnual = ((1 + tirMensal) ** 12) - 1;
    
    return res.json({
      projectionId,
      scenario,
      tirMensal,
      tirMensalPercentual: (tirMensal * 100).toFixed(2) + '%',
      tirAnual,
      tirAnualPercentual: (tirAnual * 100).toFixed(2) + '%'
    });
  } catch (error) {
    console.error('Erro ao calcular TIR:', error);
    return res.status(500).json({ 
      error: 'Erro ao calcular TIR', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Retorna os dados necessários para cálculo da TIR
 * GET /api/tir/dados?projectionId=92&scenario=padrao
 */
router.get('/dados', async (req: Request, res: Response) => {
  try {
    const projectionId = parseInt(String(req.query.projectionId || '0'));
    const scenario = String(req.query.scenario || 'padrao');
    
    if (!projectionId) {
      return res.status(400).json({ 
        error: 'ID da projeção não fornecido', 
        details: 'É necessário fornecer o parâmetro projectionId' 
      });
    }
    
    const dados = await buscarDadosParaTIR(projectionId, scenario);
    
    // Montar o fluxo de caixa para exibição
    const fluxoCaixa = montarFluxoCaixaParaTIR(dados);
    
    // Calcular valores adicionais para informação
    const anos = dados.prazoVenda / 12;
    const valorVendaProjetada = dados.valorTabela * Math.pow(1 + dados.valorizacaoAnual / 100, anos);
    const comissaoVenda = valorVendaProjetada * (dados.comissao / 100);
    const custosAdicionaisVenda = valorVendaProjetada * (dados.custosAdicionais / 100);
    const despesasVenda = comissaoVenda + custosAdicionaisVenda + dados.custosManutencao;
    
    return res.json({
      dados,
      calculados: {
        valorVendaProjetada,
        comissaoVenda,
        custosAdicionaisVenda,
        despesasVenda,
        valorLiquidoFinal: fluxoCaixa[dados.prazoVenda]
      },
      fluxoCaixa
    });
  } catch (error) {
    console.error('Erro ao buscar dados para TIR:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar dados para TIR', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Retorna o exemplo específico para a projeção 92
 * GET /api/tir/exemplo-92
 */
router.get('/exemplo-92', async (req: Request, res: Response) => {
  try {
    const resultado = await exemploProjecao92();
    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao executar exemplo da projeção 92:', error);
    return res.status(500).json({ 
      error: 'Erro ao executar exemplo', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;