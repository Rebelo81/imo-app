import { z } from 'zod';

export interface ParcelaProps {
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
}

export const FinanciamentoPlantaSchema = z.object({
  valorImovel: z.number().positive(),
  valorEntrada: z.number().min(0),
  percentualEntrada: z.number().min(0).optional(),
  desconto: z.number().min(0).optional(),  // Adicionar campo de desconto
  prazoEntrega: z.number().int().positive(),
  prazoPagamento: z.number().int().positive(),
  correcaoMensalAteChaves: z.number().min(0),
  correcaoMensalAposChaves: z.number().min(0),
  tipoParcelamento: z.enum(['automatico', 'personalizado']),
  incluirReforco: z.boolean().default(false),
  periodicidadeReforco: z.enum(['trimestral', 'semestral', 'anual']).optional(),
  valorReforco: z.number().min(0).optional(),
  valorChaves: z.number().min(0).optional(),
  parcelasPersonalizadas: z.array(z.object({
    mes: z.number().int().min(0),
    valor: z.number().positive(),
    tipo: z.enum(['Parcela', 'Reforço', 'Chaves']),
  })).optional(),
});

export type FinanciamentoPlantaInput = z.infer<typeof FinanciamentoPlantaSchema>;

export interface ResultadoFinanciamentoPlanta {
  parcelas: ParcelaProps[];
  resumo: {
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
}

function formatarData(dataBase: Date, mesesAdicionar: number): string {
  const data = new Date(dataBase);
  data.setMonth(data.getMonth() + mesesAdicionar);
  return data.toISOString().split('T')[0];
}

export function calcularFinanciamentoPlanta(input: FinanciamentoPlantaInput): ResultadoFinanciamentoPlanta {
  console.log("Iniciando cálculo de financiamento na planta (v3):", JSON.stringify(input, null, 2));
  
  const {
    valorImovel,
    valorEntrada,
    percentualEntrada,
    prazoEntrega,
    prazoPagamento,
    correcaoMensalAteChaves,
    correcaoMensalAposChaves,
    tipoParcelamento,
    incluirReforco,
    periodicidadeReforco,
    valorReforco,
    valorChaves,
    parcelasPersonalizadas,
    desconto
  } = input;

  // Valor de entrada efetivo - usa o valor direto ou calcula com base no percentual
  const valorEntradaEfetivo = percentualEntrada ? 
    Math.round(valorImovel * (percentualEntrada / 100) * 100) / 100 : 
    valorEntrada;

  const parcelas: ParcelaProps[] = [];
  const dataBase = new Date();
  
  // Consideramos o desconto como zero se não foi informado
  const valorDescontoEfetivo = desconto || 0;
  
  // NOVA FÓRMULA CORRETA DO SALDO LÍQUIDO:
  // Mês 0 = em branco ou undefined 
  // Mês 1 = Valor do imóvel - entrada - desconto
  // Mês 2+ = Resultado saldo líquido mês anterior - pgto total liquido mês anterior
  
  // Para o mês 0 não há saldo líquido (ou é nulo)
  parcelas.push({
    mes: 0,
    data: formatarData(dataBase, 0),
    tipoPagamento: 'Entrada',
    valorBase: valorEntradaEfetivo,
    percentualCorrecao: 0,
    valorCorrigido: valorEntradaEfetivo,
    saldoDevedor: valorImovel - valorEntradaEfetivo,
    saldoLiquido: undefined as any, // Mês 0: saldo líquido em branco
    correcaoAcumulada: 0
  });

  let saldoDevedorAtual = valorImovel - valorEntradaEfetivo;
  
  // Calcular valor base das parcelas automaticamente
  if (tipoParcelamento === 'automatico') {
    // Total a ser distribuído (menos entrada, reforços e chaves)
    let valorTotalReforcos = 0;
    let mesesComReforco: number[] = [];
    
    if (incluirReforco && valorReforco) {
      // Determinar meses com reforço baseado na periodicidade
      let periodo = 0;
      if (periodicidadeReforco === 'trimestral') periodo = 3;
      if (periodicidadeReforco === 'semestral') periodo = 6;
      if (periodicidadeReforco === 'anual') periodo = 12;
      
      if (periodo > 0) {
        for (let mes = periodo; mes <= prazoPagamento; mes += periodo) {
          if (mes <= prazoEntrega) {
            mesesComReforco.push(mes);
          }
        }
        
        valorTotalReforcos = mesesComReforco.length * valorReforco;
      }
    }
    
    // Valor residual na entrega das chaves
    const valorChavesEfetivo = valorChaves || 0;
    
    // Valor total a ser distribuído nas parcelas mensais
    const valorDistribuir = saldoDevedorAtual - valorTotalReforcos - valorChavesEfetivo;
    
    // Número de meses para distribuir (excluindo meses com reforço e chaves)
    const mesesComPagamentos = Array.from({ length: prazoPagamento }, (_, i) => i + 1);
    const mesesComChaves = valorChavesEfetivo > 0 ? [prazoEntrega] : [];
    
    // Remover meses que já têm reforço ou chaves
    const mesesParcelasRegulares = mesesComPagamentos.filter(
      mes => !mesesComReforco.includes(mes) && !mesesComChaves.includes(mes)
    );
    
    // Valor de cada parcela mensal
    const valorParcelaMensal = valorDistribuir / mesesParcelasRegulares.length;
    
    console.log("Detalhes do cálculo automático:", {
      valorDistribuir,
      mesesParcelasRegulares: mesesParcelasRegulares.length,
      valorParcelaMensal,
      mesesComReforco,
      valorTotalReforcos,
      valorChavesEfetivo
    });
    
    // Distribuir as parcelas mensais
    for (let mes = 1; mes <= prazoPagamento; mes++) {
      // Definir tipo e valor da parcela baseado na lógica
      let tipoPagamento: 'Parcela' | 'Reforço' | 'Chaves' = 'Parcela';
      let valorBase = valorParcelaMensal;
      
      // Verificar se é mês de reforço
      if (incluirReforco && valorReforco && mesesComReforco.includes(mes)) {
        tipoPagamento = 'Reforço';
        valorBase = valorReforco;
      }
      
      // Verificar se é mês de chaves
      if (mes === prazoEntrega && valorChavesEfetivo > 0) {
        tipoPagamento = 'Chaves';
        valorBase = valorChavesEfetivo;
      }
      
      // Calcular correção para o mês atual
      const percentualCorrecao = mes <= prazoEntrega ? 
                                correcaoMensalAteChaves : 
                                correcaoMensalAposChaves;
      
      // Atualizar saldo devedor com correção
      const correcaoMensal = saldoDevedorAtual * (percentualCorrecao / 100);
      saldoDevedorAtual += correcaoMensal;
      
      // Calcular valor corrigido da parcela - aplica correção acumulada até o momento
      const correcaoAcumulada = mes === 1 ? 
                              percentualCorrecao : 
                              parcelas[mes - 1].correcaoAcumulada + percentualCorrecao;
                              
      const valorCorrigido = valorBase * (1 + (correcaoAcumulada / 100));
      
      // Atualizar saldo devedor após o pagamento
      saldoDevedorAtual -= valorCorrigido;
      
      // CÁLCULO DO SALDO LÍQUIDO USANDO A NOVA FÓRMULA:
      let saldoLiquidoAtual = 0;
      
      if (mes === 1) {
        // Mês 1: Valor do imóvel - entrada - desconto
        saldoLiquidoAtual = valorImovel - valorEntradaEfetivo - valorDescontoEfetivo;
        console.log(`[NOVA_FORMULA] Mês ${mes}: SaldoLiquido = ${valorImovel} - ${valorEntradaEfetivo} - ${valorDescontoEfetivo} = ${saldoLiquidoAtual}`);
      } else {
        // Mês 2+: Saldo líquido do mês anterior - pagamento total líquido do mês anterior
        const mesAnterior = mes - 1;
        const parcelaAnterior = parcelas.find(p => p.mes === mesAnterior);
        
        if (parcelaAnterior) {
          // Saldo líquido do mês anterior
          const saldoLiquidoMesAnterior = parcelaAnterior.saldoLiquido;
          
          // Pagamento total líquido do mês anterior (valorBase, não corrigido)
          const pagamentoTotalLiquidoAnterior = parcelaAnterior.valorBase;
          
          // Saldo atual = saldo anterior - pagamento total líquido anterior
          saldoLiquidoAtual = saldoLiquidoMesAnterior - pagamentoTotalLiquidoAnterior;
          
          console.log(`[RECALCULO] Mês ${mes}: SaldoAnterior=${saldoLiquidoMesAnterior}, PagamentoAnterior=${pagamentoTotalLiquidoAnterior}, NovoSaldo=${saldoLiquidoAtual}`);
        } else {
          // Caso de contingência (não deveria acontecer)
          console.log(`[ALERTA] Mês ${mes}: Não encontrou mês anterior ${mesAnterior}, usando valor inicial`);
          saldoLiquidoAtual = valorImovel - valorEntradaEfetivo - valorDescontoEfetivo;
        }
      }
      
      // Adicionar parcela
      parcelas.push({
        mes,
        data: formatarData(dataBase, mes),
        tipoPagamento,
        valorBase,
        percentualCorrecao,
        valorCorrigido,
        saldoDevedor: saldoDevedorAtual,
        saldoLiquido: saldoLiquidoAtual,
        correcaoAcumulada
      });
    }
  } else if (tipoParcelamento === 'personalizado' && parcelasPersonalizadas) {
    // Usar as parcelas personalizadas fornecidas pelo usuário
    console.log("Usando parcelas personalizadas:", JSON.stringify(parcelasPersonalizadas, null, 2));
    
    // Ordenar parcelas por mês
    const parcelasOrdenadas = [...parcelasPersonalizadas].sort((a, b) => a.mes - b.mes);
    
    for (let mes = 1; mes <= prazoPagamento; mes++) {
      // Procurar se há uma parcela personalizada para este mês
      const parcelaPersonalizada = parcelasOrdenadas.find(p => p.mes === mes);
      
      // Se não há parcela para este mês, continue para o próximo
      if (!parcelaPersonalizada) continue;
      
      // Valor e tipo da parcela personalizada
      const valorBase = parcelaPersonalizada.valor;
      const tipoPagamento = parcelaPersonalizada.tipo;
      
      // Calcular correção para o mês atual
      const percentualCorrecao = mes <= prazoEntrega ? 
                                correcaoMensalAteChaves : 
                                correcaoMensalAposChaves;
      
      // Atualizar saldo devedor com correção
      const correcaoMensal = saldoDevedorAtual * (percentualCorrecao / 100);
      saldoDevedorAtual += correcaoMensal;
      
      // Calcular correção acumulada
      const correcaoAcumulada = mes === 1 ? 
                              percentualCorrecao : 
                              parcelas[parcelas.length - 1].correcaoAcumulada + percentualCorrecao;
      
      // Calcular valor corrigido da parcela
      const valorCorrigido = valorBase * (1 + (correcaoAcumulada / 100));
      
      // Atualizar saldo devedor após o pagamento
      saldoDevedorAtual -= valorCorrigido;
      
      // CÁLCULO DO SALDO LÍQUIDO USANDO A NOVA FÓRMULA:
      let saldoLiquidoAtual = 0;
      
      if (mes === 1) {
        // Mês 1: Valor do imóvel - entrada - desconto
        saldoLiquidoAtual = valorImovel - valorEntradaEfetivo - valorDescontoEfetivo;
        console.log(`[NOVA_FORMULA] Mês ${mes}: SaldoLiquido = ${valorImovel} - ${valorEntradaEfetivo} - ${valorDescontoEfetivo} = ${saldoLiquidoAtual}`);
      } else {
        // Mês 2+: Saldo líquido do mês anterior - pagamento total líquido do mês anterior
        const mesAnterior = mes - 1;
        const parcelaAnterior = parcelas.find(p => p.mes === mesAnterior);
        
        if (parcelaAnterior) {
          // Saldo líquido do mês anterior
          const saldoLiquidoMesAnterior = parcelaAnterior.saldoLiquido;
          
          // Pagamento total líquido do mês anterior (valorBase, não corrigido)
          const pagamentoTotalLiquidoAnterior = parcelaAnterior.valorBase;
          
          // Saldo atual = saldo anterior - pagamento total líquido anterior
          saldoLiquidoAtual = saldoLiquidoMesAnterior - pagamentoTotalLiquidoAnterior;
          
          console.log(`[RECALCULO] Mês ${mes}: SaldoAnterior=${saldoLiquidoMesAnterior}, PagamentoAnterior=${pagamentoTotalLiquidoAnterior}, NovoSaldo=${saldoLiquidoAtual}`);
        } else {
          // Caso de contingência (não deveria acontecer)
          console.log(`[ALERTA] Mês ${mes}: Não encontrou mês anterior ${mesAnterior}, usando valor inicial`);
          saldoLiquidoAtual = valorImovel - valorEntradaEfetivo - valorDescontoEfetivo;
        }
      }
      
      // Adicionar parcela
      parcelas.push({
        mes,
        data: formatarData(dataBase, mes),
        tipoPagamento,
        valorBase,
        percentualCorrecao,
        valorCorrigido,
        saldoDevedor: saldoDevedorAtual,
        saldoLiquido: saldoLiquidoAtual,
        correcaoAcumulada
      });
    }
  }
  
  // Calcular totais para o resumo
  let totalCorrecao = 0;
  parcelas.forEach(parcela => {
    if (parcela.valorCorrigido > parcela.valorBase) {
      totalCorrecao += (parcela.valorCorrigido - parcela.valorBase);
    }
  });
  
  const valorTotal = parcelas.reduce((sum, parcela) => sum + parcela.valorCorrigido, 0);
  const percentualCorrecao = totalCorrecao > 0 ? 
    ((valorTotal - totalCorrecao) > 0 ? (totalCorrecao / (valorTotal - totalCorrecao) * 100) : 0) : 0;
  
  const resultado: ResultadoFinanciamentoPlanta = {
    parcelas,
    resumo: {
      valorImovel,
      valorEntrada: valorEntradaEfetivo,
      valorFinanciado: valorImovel - valorEntradaEfetivo,
      prazoEntrega,
      prazoPagamento,
      totalParcelas: parcelas.length,
      totalCorrecao,
      percentualCorrecao,
      valorTotal
    }
  };
  
  console.log(`Cálculo concluído. ${parcelas.length} parcelas geradas.`);
  return resultado;
}