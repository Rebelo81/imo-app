import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileBarChart,
  PieChart,
  TrendingUp,
  LayoutGrid,
  DollarSign,
  Home,
  CreditCard,
  Calendar,
  Clock,
  Percent,
  Key,
  Repeat,
  CircleDollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  PieChart as RechartsChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from 'recharts';

interface FinanciamentoPlantaChartsProps {
  projectionId: number;
}

// Componente para exibir os três gráficos requisitados
const FinanciamentoPlantaCharts: React.FC<FinanciamentoPlantaChartsProps> = ({ projectionId }) => {
  // Estados para controle de colapso (apenas mobile)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showYAxis, setShowYAxis] = useState(false);

  // Hook para detectar se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsCollapsed(mobile); // Inicia colapsado apenas no mobile
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
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

  // Preparar dados para gráfico de distribuição de pagamentos
  const paymentDistributionData = useMemo(() => {
    if (!calculosProjecao) return [];

    // Encontrar a entrada (mês 0)
    const entrada = calculosProjecao.find((c: any) => c.mes === 0);
    let valorEntrada = entrada ? parseFloat(entrada.valorEntrada) : 0;
    
    // Normalizar valores extremamente grandes (valores incorretos na base)
    if (Math.abs(valorEntrada) > 1000000) {
      valorEntrada = valorEntrada / 100000;
    }
    
    // Calcular valores para parcelas, reforços e chaves
    let totalParcelas = 0;
    let totalReforcos = 0;
    let totalChaves = 0;

    calculosProjecao.forEach((c: any) => {
      if (c.mes > 0) { // Ignorar mês 0 (entrada)
        let parcelaBase = parseFloat(c.parcelaBase) || 0;
        let reforcoBase = parseFloat(c.reforcoBase) || 0;
        let valorChaves = parseFloat(c.valorChaves) || 0;
        
        // Normalizar valores extremamente grandes
        if (Math.abs(parcelaBase) > 1000000) parcelaBase = parcelaBase / 100000;
        if (Math.abs(reforcoBase) > 1000000) reforcoBase = reforcoBase / 100000;
        if (Math.abs(valorChaves) > 1000000) valorChaves = valorChaves / 100000;
        
        totalParcelas += parcelaBase;
        totalReforcos += reforcoBase;
        totalChaves += valorChaves;
      }
    });

    const total = valorEntrada + totalParcelas + totalReforcos + totalChaves;
    
    return [
      { name: 'Entrada', value: valorEntrada, percentage: ((valorEntrada / total) * 100).toFixed(1), color: '#6366F1' },
      { name: 'Parcelas', value: totalParcelas, percentage: ((totalParcelas / total) * 100).toFixed(1), color: '#10B981' },
      { name: 'Reforços', value: totalReforcos, percentage: ((totalReforcos / total) * 100).toFixed(1), color: '#F59E0B' },
      { name: 'Chaves', value: totalChaves, percentage: ((totalChaves / total) * 100).toFixed(1), color: '#8B5CF6' }
    ].filter(item => item.value > 0);
  }, [calculosProjecao]);

  // Preparar dados para gráfico de composição do financiamento
  const financingCompositionData = useMemo(() => {
    if (!calculosProjecao || !projection) return [];

    // Valor total do imóvel
    const valorImovel = parseFloat(projection.listPrice || '0');
    
    // Encontrar a entrada (mês 0)
    const entrada = calculosProjecao.find((c: any) => c.mes === 0);
    let valorEntrada = entrada ? parseFloat(entrada.valorEntrada) : 0;
    
    // Normalizar valores extremamente grandes (valores incorretos na base)
    if (Math.abs(valorEntrada) > 1000000) {
      valorEntrada = valorEntrada / 100000;
    }
    
    // Calcular valor total de correção
    let totalCorrecao = 0;
    calculosProjecao.forEach((c: any) => {
      if (c.mes > 0) {
        let parcelaBase = parseFloat(c.parcelaBase) || 0;
        let parcelaCorrigida = parseFloat(c.parcelaCorrigida) || 0;
        let reforcoBase = parseFloat(c.reforcoBase) || 0;
        let reforcoCorrigido = parseFloat(c.reforcoCorrigido) || 0;
        let chavesBase = parseFloat(c.valorChaves) || 0;
        let chavesCorrigido = parseFloat(c.chavesCorrigido) || 0;
        
        // Normalizar valores extremamente grandes
        if (Math.abs(parcelaBase) > 1000000) parcelaBase = parcelaBase / 100000;
        if (Math.abs(parcelaCorrigida) > 1000000) parcelaCorrigida = parcelaCorrigida / 100000;
        if (Math.abs(reforcoBase) > 1000000) reforcoBase = reforcoBase / 100000;
        if (Math.abs(reforcoCorrigido) > 1000000) reforcoCorrigido = reforcoCorrigido / 100000;
        if (Math.abs(chavesBase) > 1000000) chavesBase = chavesBase / 100000;
        if (Math.abs(chavesCorrigido) > 1000000) chavesCorrigido = chavesCorrigido / 100000;
        
        totalCorrecao += (parcelaCorrigida - parcelaBase) + 
                         (reforcoCorrigido - reforcoBase) + 
                         (chavesCorrigido - chavesBase);
      }
    });
    
    // Valor financiado é o valor total menos a entrada
    const valorFinanciado = valorImovel - valorEntrada;
    const total = valorImovel + totalCorrecao;
    
    return [
      { name: 'Financiado', value: valorFinanciado, percentage: ((valorFinanciado / total) * 100).toFixed(1), color: '#6366F1' },
      { name: 'Entrada', value: valorEntrada, percentage: ((valorEntrada / total) * 100).toFixed(1), color: '#3B82F6' },
      { name: 'Correção', value: totalCorrecao, percentage: ((totalCorrecao / total) * 100).toFixed(1), color: '#10B981' }
    ].filter(item => item.value > 0);
  }, [calculosProjecao, projection]);

  // Preparar dados para gráfico de fluxo de pagamentos e saldo devedor
  const cashFlowData = useMemo(() => {
    if (!calculosProjecao) return [];
    
    return calculosProjecao
      .sort((a: any, b: any) => a.mes - b.mes)
      .map((c: any) => {
        const pagamento = parseFloat(c.pagamentoTotal) || 0;
        const saldoDevedor = parseFloat(c.saldoDevedorCorrigido) || 0;
        
        return {
          mes: c.mes,
          pagamento,
          saldoDevedor
        };
      });
  }, [calculosProjecao]);

  // Componente do tooltip personalizado para os gráficos de pizza
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white shadow-md rounded-md p-2 text-xs border">
          <p className="font-medium">{data.name}</p>
          <p>{formatCurrency(data.value)} ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando gráficos...</div>;
  }

  // Calcular valores do financiamento baseado nos dados da tabela de amortização
  let financingCalculations = null;
  
  if (calculosProjecao && calculosProjecao.length > 0) {
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
    
    financingCalculations = {
      totalPagoCorrigido,
      totalCorrecao,
      percentualCorrecao,
      valorMedioParcelas,
      totalParcelasCorrigidas,
      totalReforcosCorrigidos,
      totalChavesCorrigidos,
      totalCorrigidoAteEntrega
    };
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Gráfico de Distribuição dos Pagamentos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-indigo-600">
            <PieChart className="h-4 w-4" />
            Distribuição dos Pagamentos
          </CardTitle>
          <p className="text-xs text-gray-500">Valores por tipo de pagamento</p>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsChart>
                <Pie
                  data={paymentDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                  style={{ fontSize: '10px' }}
                >
                  {paymentDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
            {paymentDistributionData.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-[10px] md:text-xs truncate">{item.name}</span>
                </div>
                <span className="text-[10px] md:text-xs font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Composição do Financiamento */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-indigo-600">
            <LayoutGrid className="h-4 w-4" />
            Composição do Financiamento
          </CardTitle>
          <p className="text-xs text-gray-500">Distribuição dos valores no financiamento</p>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsChart>
                <Pie
                  data={financingCompositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                  style={{ fontSize: '10px' }}
                >
                  {financingCompositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
            {financingCompositionData.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-[10px] md:text-xs truncate">{item.name}</span>
                </div>
                <span className="text-[10px] md:text-xs font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Fluxo de Pagamentos e Saldo Devedor */}
      <Collapsible 
        open={!isCollapsed || !isMobile} 
        onOpenChange={(open) => setIsCollapsed(!open)}
        className="md:col-span-2"
      >
        <Card className="shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 hover:bg-gray-50 transition-colors cursor-pointer">
              <CardTitle className="text-base flex items-center justify-between text-indigo-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Fluxo de Pagamentos e Saldo Devedor
                </div>
                {isMobile && (
                  <div className="flex items-center gap-1">
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </div>
                )}
              </CardTitle>
              {isMobile && (
                <p className="text-xs text-gray-500 text-left">
                  {isCollapsed ? 'Toque para expandir' : 'Evolução dos pagamentos e saldo devedor'}
                </p>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Botão para mostrar/ocultar eixo Y no mobile */}
              {isMobile && (
                <div className="mb-3 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowYAxis(!showYAxis);
                    }}
                    className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {showYAxis ? 'Ocultar Valores' : 'Mostrar Valores'}
                  </button>
                </div>
              )}
              
              <div className="h-[280px] md:h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cashFlowData}
                    margin={{ 
                      top: 15, 
                      right: isMobile ? 5 : 30, 
                      left: isMobile ? (showYAxis ? 35 : 5) : 0, 
                      bottom: isMobile ? 25 : 0 
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                    <XAxis 
                      dataKey="mes" 
                      label={!isMobile ? { value: 'Mês', position: 'insideBottomRight', offset: -5 } : undefined}
                      tick={{ fontSize: isMobile ? 9 : 12 }}
                      interval={isMobile ? 'preserveStartEnd' : 0}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${Math.abs(value) > 999 ? `${(value / 1000).toFixed(0)}k` : value}`}
                      tick={isMobile ? (showYAxis ? { fontSize: 9 } : false) : { fontSize: 12 }}
                      axisLine={isMobile ? showYAxis : true}
                      tickLine={isMobile ? showYAxis : true}
                      width={isMobile ? (showYAxis ? 35 : 0) : 60}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      labelFormatter={(label) => `Mês ${label}`}
                      contentStyle={{ 
                        fontSize: isMobile ? '10px' : '12px',
                        padding: isMobile ? '4px 6px' : '8px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        fontSize: isMobile ? '9px' : '12px',
                        paddingTop: isMobile ? '8px' : '10px'
                      }}
                      iconSize={isMobile ? 6 : 12}
                    />
                    <Line
                      type="monotone"
                      dataKey="pagamento"
                      name="Pagamentos"
                      stroke="#6366F1"
                      strokeWidth={isMobile ? 2 : 2}
                      dot={false}
                      activeDot={{ r: isMobile ? 3 : 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saldoDevedor"
                      name="Saldo Devedor"
                      stroke="#10B981"
                      strokeWidth={isMobile ? 2 : 2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: isMobile ? 3 : 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
};

export default FinanciamentoPlantaCharts;