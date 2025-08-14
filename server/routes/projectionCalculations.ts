import { Request, Response, Router } from "express";
import { storage } from "../storage";
// Importar o tipo do cálculo de financiamento (para tipagem)
import { FinanciamentoPlantaInput } from "../calculators/formulasFinanciamentoPlanta";
// Importar o adaptador Python para o cálculo de financiamento
import { calcularFinanciamentoPlantaPython, startPythonServer } from "../calculators/pythonCalcAdapter";
import { calculateFutureValue, generateFutureSaleCashFlow } from "../calculators/futureValueCalculator";
import { calculateAssetAppreciation, generateAssetAppreciationYearlyData } from "../calculators/assetAppreciationCalculator";
import { calculateRentalYield, generateRentalYieldYearlyData } from "../calculators/rentalYieldCalculator";
import { CalculationResults, PROJECTION_STRATEGY } from "@shared/schema";

// Iniciar o servidor Python na inicialização
startPythonServer().catch(err => console.error("Erro ao iniciar servidor Python:", err));

const router = Router();

/**
 * Calcula todos os resultados para uma projeção e salva no banco de dados
 */
router.post("/projections/:id/calculate", async (req: Request, res: Response) => {
  try {
    const projectionId = parseInt(req.params.id);
    
    if (isNaN(projectionId)) {
      return res.status(400).json({ error: "ID de projeção inválido" });
    }
    
    // Buscar projeção existente
    const projection = await storage.getProjection(projectionId);
    
    if (!projection) {
      return res.status(404).json({ error: "Projeção não encontrada" });
    }
    
    // Calcular os valores do financiamento na planta
    const financiamentoInput: FinanciamentoPlantaInput = {
      valorImovel: Number(projection.listPrice) || 0,
      valorEntrada: Number(projection.downPayment) || 0,
      prazoEntrega: Number(projection.deliveryMonths) || 36,
      prazoPagamento: Number(projection.paymentMonths) || 36,
      correcaoMensalAteChaves: Number(projection.monthlyCorrection) || 0,
      correcaoMensalAposChaves: Number(projection.postDeliveryCorrection) || 0,
      tipoParcelamento: 'automatico',
      incluirReforco: projection.includeBonusPayments || false,
      periodicidadeReforco: projection.bonusFrequency === 3 ? 'trimestral' : 
                           projection.bonusFrequency === 6 ? 'semestral' : 'anual',
      valorReforco: Number(projection.bonusValue) || 0,
      valorChaves: Number(projection.keysValue) || 0,
      desconto: Number(projection.discount) || 0
    };
    
    // Usar o serviço Python para o cálculo
    const financiamentoPlanta = await calcularFinanciamentoPlantaPython(financiamentoInput);
    
    // Inicializar objeto calculationResults
    const calculationResults: CalculationResults = {};
    
    // Adicionar resultados do financiamento na planta
    calculationResults.financiamentoPlanta = financiamentoPlanta;
    
    // Calcular resultados para cada estratégia da projeção
    const strategies = projection.strategies || [];
    
    // Estratégia: Venda Futura
    if (strategies.includes(PROJECTION_STRATEGY.FUTURE_SALE)) {
      const futureSaleResults = calculateFutureValue(projection);
      calculationResults.futureSale = futureSaleResults;
      calculationResults.roi = futureSaleResults.roi;
      calculationResults.irr = futureSaleResults.irr;
      calculationResults.paybackMonths = futureSaleResults.paybackMonths;
      calculationResults.netProfit = futureSaleResults.netProfit;
      
      // Gerar fluxo de caixa para venda futura
      calculationResults.futureSaleCashFlow = generateFutureSaleCashFlow(projection);
    }
    
    // Estratégia: Valorização Patrimonial
    if (strategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION)) {
      calculationResults.assetAppreciation = calculateAssetAppreciation(projection);
      
      // Gerar dados anuais para visualização (para 15 anos)
      calculationResults.assetAppreciationYearly = generateAssetAppreciationYearlyData(projection, 15);
    }
    
    // Estratégia: Rentabilidade com Locação
    if (strategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD)) {
      calculationResults.rentalYield = calculateRentalYield(projection);
      
      // Gerar dados anuais para visualização (para 15 anos)
      calculationResults.rentalYieldYearly = generateRentalYieldYearlyData(
        projection, 
        Number(projection.deliveryMonths) || 36,
        15
      );
    }
    
    // Calcular os detalhes da projeção por cenário
    try {
      // Importação dinâmica do módulo para evitar erros de dependência circular
      const { createProjectionCalculations } = await import('../calculators/projectionDetailsCalculator');
      
      // Tentar criar os cálculos detalhados por cenário
      if (projection.calculationResults?.financiamentoPlanta?.parcelas) {
        // Gerar cálculos para todos os cenários
        const calculosProjecao = createProjectionCalculations(projection);
        
        // Deletar cálculos existentes para não duplicar
        await storage.deleteCalculosByProjection(projectionId);
        
        // Salvar os novos cálculos no banco
        await storage.createCalculosProjecao(calculosProjecao);
        
        // Adicionar os cálculos aos resultados
        const calculos = await storage.getCalculosProjecao(projectionId);
        calculationResults.calculosProjecao = calculos;
      }
    } catch (error) {
      console.error("Erro ao calcular detalhes por cenário:", error);
      // Não interrompe o fluxo principal se este cálculo falhar
    }

    // Atualizar projeção com os resultados calculados
    const updatedProjection = await storage.updateProjection(projectionId, {
      calculationResults: calculationResults
    });
    
    if (!updatedProjection) {
      return res.status(500).json({ error: "Erro ao atualizar projeção com resultados calculados" });
    }
    
    return res.status(200).json({
      success: true,
      projection: updatedProjection
    });
    
  } catch (error: any) {
    console.error("Erro ao calcular projeção:", error);
    return res.status(500).json({ 
      error: "Erro ao calcular projeção", 
      details: error.message 
    });
  }
});

/**
 * Recalcula os resultados para uma estratégia específica
 */
router.post("/projections/:id/calculate/:strategy", async (req: Request, res: Response) => {
  try {
    const projectionId = parseInt(req.params.id);
    const strategy = req.params.strategy.toUpperCase();
    
    if (isNaN(projectionId)) {
      return res.status(400).json({ error: "ID de projeção inválido" });
    }
    
    // Verificar se a estratégia é válida
    if (!Object.values(PROJECTION_STRATEGY).includes(strategy as any)) {
      return res.status(400).json({ error: "Estratégia inválida" });
    }
    
    // Buscar projeção existente
    const projection = await storage.getProjection(projectionId);
    
    if (!projection) {
      return res.status(404).json({ error: "Projeção não encontrada" });
    }
    
    // Verificar se a projeção inclui a estratégia solicitada
    if (!projection.strategies.includes(strategy as any)) {
      return res.status(400).json({ error: "Projeção não inclui esta estratégia" });
    }
    
    // Inicializar calculationResults com os valores existentes ou um objeto vazio
    const calculationResults: CalculationResults = projection.calculationResults || {};
    
    // Verificar se precisamos calcular o financiamento na planta primeiro
    if (!calculationResults.financiamentoPlanta) {
      const financiamentoInput: FinanciamentoPlantaInput = {
        valorImovel: Number(projection.listPrice) || 0,
        valorEntrada: Number(projection.downPayment) || 0,
        prazoEntrega: Number(projection.deliveryMonths) || 36,
        prazoPagamento: Number(projection.paymentMonths) || 36,
        correcaoMensalAteChaves: Number(projection.monthlyCorrection) || 0,
        correcaoMensalAposChaves: Number(projection.postDeliveryCorrection) || 0,
        tipoParcelamento: 'automatico',
        incluirReforco: projection.includeBonusPayments || false,
        periodicidadeReforco: projection.bonusFrequency === 3 ? 'trimestral' : 
                             projection.bonusFrequency === 6 ? 'semestral' : 'anual',
        valorReforco: Number(projection.bonusValue) || 0,
        valorChaves: Number(projection.keysValue) || 0,
        desconto: Number(projection.discount) || 0
      };
      
      // Usar o serviço Python para o cálculo
      calculationResults.financiamentoPlanta = await calcularFinanciamentoPlantaPython(financiamentoInput);
    }
    
    // Calcular resultados para a estratégia específica
    if (strategy === PROJECTION_STRATEGY.FUTURE_SALE) {
      const futureSaleResults = calculateFutureValue(projection);
      calculationResults.futureSale = futureSaleResults;
      calculationResults.roi = futureSaleResults.roi;
      calculationResults.irr = futureSaleResults.irr;
      calculationResults.paybackMonths = futureSaleResults.paybackMonths;
      calculationResults.netProfit = futureSaleResults.netProfit;
      
      // Gerar fluxo de caixa para venda futura
      calculationResults.futureSaleCashFlow = generateFutureSaleCashFlow(projection);
    } 
    else if (strategy === PROJECTION_STRATEGY.ASSET_APPRECIATION) {
      calculationResults.assetAppreciation = calculateAssetAppreciation(projection);
      
      // Gerar dados anuais para visualização (para 15 anos)
      calculationResults.assetAppreciationYearly = generateAssetAppreciationYearlyData(projection, 15);
    } 
    else if (strategy === PROJECTION_STRATEGY.RENTAL_YIELD) {
      calculationResults.rentalYield = calculateRentalYield(projection);
      
      // Gerar dados anuais para visualização (para 15 anos)
      calculationResults.rentalYieldYearly = generateRentalYieldYearlyData(
        projection, 
        Number(projection.deliveryMonths) || 36,
        15
      );
    }
    
    // Se for estratégia FUTURE_SALE, calcular os detalhes da projeção por cenário
    if (strategy === PROJECTION_STRATEGY.FUTURE_SALE && projection.calculationResults?.financiamentoPlanta?.parcelas) {
      try {
        // Importação dinâmica do módulo para evitar erros de dependência circular
        const { createProjectionCalculations } = await import('../calculators/projectionDetailsCalculator');
        
        // Gerar cálculos para todos os cenários
        const calculosProjecao = createProjectionCalculations(projection);
        
        // Deletar cálculos existentes para não duplicar
        await storage.deleteCalculosByProjection(projectionId);
        
        // Salvar os novos cálculos no banco
        await storage.createCalculosProjecao(calculosProjecao);
        
        // Adicionar os cálculos aos resultados
        const calculos = await storage.getCalculosProjecao(projectionId);
        calculationResults.calculosProjecao = calculos;
      } catch (error) {
        console.error("Erro ao calcular detalhes por cenário:", error);
        // Não interrompe o fluxo principal se este cálculo falhar
      }
    }

    // Atualizar projeção com os resultados calculados
    const updatedProjection = await storage.updateProjection(projectionId, {
      calculationResults: calculationResults
    });
    
    if (!updatedProjection) {
      return res.status(500).json({ error: "Erro ao atualizar projeção com resultados calculados" });
    }
    
    return res.status(200).json({
      success: true,
      projection: updatedProjection
    });
    
  } catch (error: any) {
    console.error("Erro ao calcular estratégia:", error);
    return res.status(500).json({ 
      error: "Erro ao calcular estratégia", 
      details: error.message 
    });
  }
});

/**
 * Obtém os valores de cálculo da projeção para um cenário específico
 */
router.get("/projections/:id/calculo/:scenario", async (req: Request, res: Response) => {
  try {
    const projectionId = parseInt(req.params.id);
    const scenario = req.params.scenario;
    
    if (isNaN(projectionId)) {
      return res.status(400).json({ error: "ID de projeção inválido" });
    }
    
    // Validar cenário
    if (!['padrao', 'conservador', 'otimista'].includes(scenario)) {
      return res.status(400).json({ error: "Cenário inválido. Use: padrao, conservador ou otimista" });
    }
    
    // Buscar projeção existente
    const projection = await storage.getProjection(projectionId);
    
    if (!projection) {
      return res.status(404).json({ error: "Projeção não encontrada" });
    }
    
    // Buscar os cálculos da projeção para este cenário
    const allCalculos = await storage.getCalculosProjecao(projectionId);
    
    // Filtrar por cenário
    const calculosPorCenario = allCalculos.filter(calculo => calculo.scenario === scenario);
    
    if (calculosPorCenario.length === 0) {
      // Se não houver cálculos, gerar novos cálculos agora
      try {
        // Importação dinâmica do módulo
        const { createProjectionCalculations } = await import('../calculators/projectionDetailsCalculator');
        
        if (projection.calculationResults?.financiamentoPlanta?.parcelas) {
          // Gerar cálculos para todos os cenários
          const calculosProjecao = createProjectionCalculations(projection);
          
          // Filtrar apenas para este cenário
          const calculosDesejados = calculosProjecao.filter(calculo => calculo.scenario === scenario);
          
          // Salvar os novos cálculos no banco
          const novosCálculos = await storage.createCalculosProjecao(calculosDesejados);
          
          return res.status(200).json({
            success: true,
            calculos: novosCálculos,
            mesDaVenda: novosCálculos.length > 0 ? novosCálculos[0].mesDaVenda : 0
          });
        } else {
          return res.status(404).json({ 
            error: "Financiamento na planta não calculado", 
            message: "Calcule o financiamento primeiro" 
          });
        }
      } catch (error) {
        console.error("Erro ao gerar cálculos por cenário:", error);
        return res.status(500).json({ 
          error: "Erro ao gerar cálculos por cenário", 
          details: (error as Error).message 
        });
      }
    }
    
    // Calcular resumo de valores totais
    const { calculatePaymentTotals } = await import('../calculators/projectionDetailsCalculator');
    const totals = calculatePaymentTotals(projection, scenario as any);
    
    return res.status(200).json({
      success: true,
      calculos: calculosPorCenario,
      mesDaVenda: calculosPorCenario.length > 0 ? calculosPorCenario[0].mesDaVenda : 0,
      totais: totals
    });
    
  } catch (error: any) {
    console.error("Erro ao buscar cálculos por cenário:", error);
    return res.status(500).json({ 
      error: "Erro ao buscar cálculos por cenário", 
      details: error.message 
    });
  }
});

export default router;