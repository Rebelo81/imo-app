import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileBarChart,
  DollarSign,
  TrendingUp,
  Percent,
  CreditCard,
  Calendar,
  Repeat,
  Key,
  Home
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FinanciamentoTotaisProps {
  projectionId: number;
}

// Componente específico para exibir somente as seções de Totais de Financiamento e Detalhamento de Valores
const FinanciamentoTotais: React.FC<FinanciamentoTotaisProps> = ({ projectionId }) => {
  // Buscar dados dos cálculos da projeção
  const { data: calculosProjecao, isLoading } = useQuery({
    queryKey: ['/api/projections', projectionId, 'calculo_projecoes'],
    queryFn: async () => {
      const response = await fetch(`/api/projections/${projectionId}/calculo_projecoes`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de amortização');
      }
      return response.json();
    },
    enabled: !!projectionId
  });

  // Buscar resumo da projeção
  const { data: projection } = useQuery({
    queryKey: ['/api/projections', projectionId],
    queryFn: async () => {
      const response = await fetch(`/api/projections/${projectionId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados da projeção');
      }
      return response.json();
    },
    enabled: !!projectionId
  });

  // Calcular valores do financiamento baseado nos dados da tabela de amortização
  const financingCalculations = useMemo(() => {
    if (!calculosProjecao || !projection || calculosProjecao.length === 0) return null;
    
    // Valores iniciais
    let totalPagoCorrigido = 0;
    let totalCorrecao = 0;
    let totalParcelasBase = 0;
    let totalParcelasCorrigidas = 0;
    let totalReforcosBase = 0;
    let totalReforcosCorrigidos = 0;
    let totalChavesBase = 0;
    let totalChavesCorrigidos = 0;
    let totalCorrigidoAteEntrega = 0;
    let countParcelas = 0;
    
    // Valor da entrada (será adicionado ao total pago)
    const valorEntrada = parseFloat(projection?.downPayment || '0');
    
    // Mês de entrega das chaves (para calcular o total até a entrega)
    const mesEntrega = projection?.deliveryMonths || 0;

    calculosProjecao.forEach((calculo: any) => {
      const parcelaBase = parseFloat(calculo.parcelaBase || 0);
      const parcelaCorrigida = parseFloat(calculo.parcelaCorrigida || 0);
      const reforcoBase = parseFloat(calculo.reforcoBase || 0);
      const reforcoCorrigido = parseFloat(calculo.reforcoCorrigido || 0);
      const chavesBase = parseFloat(calculo.valorChaves || 0);
      const chavesCorrigido = parseFloat(calculo.chavesCorrigido || 0);
      
      if (parcelaBase !== 0) countParcelas++;
      
      // Calcular totais para parcelas, reforços e chaves
      totalParcelasBase += Math.abs(parcelaBase);
      totalParcelasCorrigidas += Math.abs(parcelaCorrigida);
      totalReforcosBase += Math.abs(reforcoBase);
      totalReforcosCorrigidos += Math.abs(reforcoCorrigido);
      totalChavesBase += Math.abs(chavesBase);
      totalChavesCorrigidos += Math.abs(chavesCorrigido);
      
      // Total pago corrigido (todas as parcelas, reforços e chaves)
      // A entrada será adicionada ao final fora do loop
      totalPagoCorrigido += Math.abs(parcelaCorrigida) + Math.abs(reforcoCorrigido) + Math.abs(chavesCorrigido);
      
      // Total da correção (diferença entre valor base e corrigido)
      const correcaoParcela = Math.abs(parcelaCorrigida) - Math.abs(parcelaBase);
      const correcaoReforco = Math.abs(reforcoCorrigido) - Math.abs(reforcoBase);
      const correcaoChaves = Math.abs(chavesCorrigido) - Math.abs(chavesBase);
      totalCorrecao += correcaoParcela + correcaoReforco + correcaoChaves;
      
      // Total corrigido até a entrega
      if (calculo.mes <= mesEntrega) {
        totalCorrigidoAteEntrega += Math.abs(parcelaCorrigida) + Math.abs(reforcoCorrigido) + Math.abs(chavesCorrigido);
      }
    });
    
    // Adicionar a entrada ao total pago (foi solicitado incluir a entrada no valor total)
    totalPagoCorrigido += valorEntrada;
    
    // Total corrigido até a entrega também deve incluir a entrada
    totalCorrigidoAteEntrega += valorEntrada;
    
    // Calcular valor médio das parcelas
    const valorMedioParcelas = countParcelas > 0 ? totalParcelasCorrigidas / countParcelas : 0;
    
    // Calcular o total base para obter o percentual de correção
    const totalBase = totalParcelasBase + totalReforcosBase + totalChavesBase;
    const percentualCorrecao = totalBase > 0 ? (totalCorrecao / totalBase) * 100 : 0;
    
    return {
      totalPagoCorrigido,
      totalCorrecao,
      percentualCorrecao,
      valorMedioParcelas,
      totalParcelasCorrigidas,
      totalReforcosCorrigidos,
      totalChavesCorrigidos,
      totalCorrigidoAteEntrega
    };
  }, [calculosProjecao, projection]);

  if (isLoading) {
    return <div className="text-center p-4">Carregando resumo do financiamento...</div>;
  }

  return (
    <>
      {/* Totais de Financiamento */}
      <div className="mb-8 -mx-6 px-6 md:mx-0 md:px-0">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-[#434BE6] px-6 md:px-0 -mx-6 md:mx-0">
          <FileBarChart className="h-4 w-4 text-[#434BE6]" />
          Totais de Financiamento
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-4">
          
          {/* Card 1: Valor Total Pago Corrigido */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs md:text-sm">Valor Pago Corrigido</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalPagoCorrigido) : 'R$ 0,00'}
            </div>
          </div>

          {/* Card 2: Valor Total da Correção */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-red-500 flex-shrink-0" />
              <span className="text-xs md:text-sm">Total da Correção</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalCorrecao) : 'R$ 0,00'}
            </div>
          </div>

          {/* Card 3: Percentual Total da Correção */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <Percent className="h-3 w-3 md:h-4 md:w-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs md:text-sm">% Total da Correção</span>
            </div>
            <div className="text-sm md:text-lg font-bold leading-tight">
              {financingCalculations ? financingCalculations.percentualCorrecao.toFixed(2) : '0,00'}
              <span className="text-xs font-normal text-slate-500 ml-1">%</span>
            </div>
          </div>

          {/* Card 4: Valor Médio das Parcelas */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
              <span className="text-xs md:text-sm">Valor Médio Parcelas</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.valorMedioParcelas) : 'R$ 0,00'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Detalhamento de Valores */}
      <div className="mb-8 -mx-6 px-6 md:mx-0 md:px-0">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-[#434BE6] px-6 md:px-0 -mx-6 md:mx-0">
          <DollarSign className="h-4 w-4 text-[#434BE6]" />
          Detalhamento de Valores
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-4">
          
          {/* Card 1: Valor Total das Parcelas Corrigidas */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-indigo-500 flex-shrink-0" />
              <span className="text-xs md:text-sm">Total Parcelas</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalParcelasCorrigidas) : 'R$ 0,00'}
            </div>
          </div>

          {/* Card 2: Valor Total dos Reforços Corrigidos */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <Repeat className="h-3 w-3 md:h-4 md:w-4 text-orange-500 flex-shrink-0" />
              <span className="text-xs md:text-sm">Total Reforços</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalReforcosCorrigidos) : 'R$ 0,00'}
            </div>
          </div>

          {/* Card 3: Valor Total das Chaves Corrigidos */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <Key className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 flex-shrink-0" />
              <span className="text-xs md:text-sm">Total Chaves</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalChavesCorrigidos) : 'R$ 0,00'}
            </div>
          </div>

          {/* Card 4: Valor Total Corrigido até a Entrega */}
          <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
              <Home className="h-3 w-3 md:h-4 md:w-4 text-cyan-600 flex-shrink-0" />
              <span className="text-xs md:text-sm">Total até Entrega</span>
            </div>
            <div className="text-sm md:text-lg font-bold break-words leading-tight">
              {financingCalculations ? formatCurrency(financingCalculations.totalCorrigidoAteEntrega) : 'R$ 0,00'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FinanciamentoTotais;