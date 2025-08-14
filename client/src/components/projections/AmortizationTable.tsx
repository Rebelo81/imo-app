import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Filter,
  Percent,
  Activity,
  DollarSign,
  Repeat,
  Database,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AmortizationTableProps {
  projectionId: number;
}

interface TableColumn {
  id: string;
  label: string;
  group: 'dados' | 'valores' | 'saldos';
  icon?: React.ReactNode;
}

const AmortizationTable: React.FC<AmortizationTableProps> = ({ projectionId }) => {
  // Estado para controlar colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'taxa',
    'correcao',
    'parcela',
    'reforco',
    'chaves',
    'saldoLiquido',
    'saldoDevedor'
  ]);

  // Estado para controlar se a tabela está colapsada
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Detectar se é mobile e ajustar estado inicial
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      setIsCollapsed(mobile); // Colapsada apenas no mobile
    };

    // Verificar no mount
    checkIsMobile();

    // Adicionar listener para mudanças de tamanho
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Definição de todas as colunas disponíveis
  const availableColumns: TableColumn[] = [
    { id: 'taxa', label: 'Taxa', group: 'dados', icon: <Percent className="h-4 w-4 text-amber-500" /> },
    { id: 'correcao', label: 'Correção', group: 'dados', icon: <Activity className="h-4 w-4 text-blue-500" /> },
    { id: 'parcela', label: 'Parcela', group: 'valores', icon: <DollarSign className="h-4 w-4 text-indigo-600" /> },
    { id: 'reforco', label: 'Reforço', group: 'valores', icon: <Repeat className="h-4 w-4 text-green-500" /> },
    { id: 'chaves', label: 'Chaves', group: 'valores', icon: <CheckCircle2 className="h-4 w-4 text-orange-500" /> },
    { id: 'saldoLiquido', label: 'Saldo Líquido', group: 'saldos', icon: <Database className="h-4 w-4 text-green-600" /> },
    { id: 'saldoDevedor', label: 'Saldo Devedor', group: 'saldos', icon: <Database className="h-4 w-4 text-slate-600" /> },
  ];

  // Buscar dados da tabela de amortização
  const { data: calculosProjecao, isLoading, isError, error } = useQuery({
    queryKey: ['/api/projections', projectionId, 'calculo_projecoes'],
    queryFn: async () => {
      const response = await fetch(`/api/projections/${projectionId}/calculo_projecoes`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de amortização');
      }
      const data = await response.json();
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Dados de amortização não encontrados');
      }
      return data;
    },
    enabled: !!projectionId,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0 // Sempre buscar dados frescos
  });

  // Função para alternar a visibilidade de uma coluna
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };

  // Agrupar colunas por categoria
  const columnGroups = useMemo(() => {
    return {
      dados: availableColumns.filter(col => col.group === 'dados'),
      valores: availableColumns.filter(col => col.group === 'valores'),
      saldos: availableColumns.filter(col => col.group === 'saldos')
    };
  }, [availableColumns]);

  // Função para verificar se a entrada é uma entrada inicial
  const isEntrada = (mes: number) => mes === 0;

  // Função para formatar o valor como moeda
  const formatValue = (value: string | number) => {
    if (value === undefined || value === null) return '-';
    let numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue === 0 ? '-' : formatCurrency(numValue);
  };

  // Função para exportar para Excel
  const exportToExcel = async () => {
    if (!calculosProjecao || calculosProjecao.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    setIsExporting(true);

    try {
      // Preparar dados para exportação
      const exportData = sortedCalculos.map((calculo: any) => ({
        'Mês': calculo.mes === 0 ? 'Entrada' : calculo.mes,
        'Taxa Mensal (%)': calculo.taxa_mensal ? (parseFloat(calculo.taxa_mensal) * 100).toFixed(4) : '-',
        'Correção Acumulada (%)': calculo.correcao_acumulada ? (parseFloat(calculo.correcao_acumulada) * 100).toFixed(4) : '-',
        'Parcela Base': calculo.parcela_base ? parseFloat(calculo.parcela_base).toFixed(2) : '-',
        'Parcela Corrigida': calculo.parcela_corrigida ? parseFloat(calculo.parcela_corrigida).toFixed(2) : '-',
        'Reforço Base': calculo.reforco_base ? parseFloat(calculo.reforco_base).toFixed(2) : '-',
        'Reforço Corrigido': calculo.reforco_corrigido ? parseFloat(calculo.reforco_corrigido).toFixed(2) : '-',
        'Chaves Base': calculo.chaves_base ? parseFloat(calculo.chaves_base).toFixed(2) : '-',
        'Chaves Corrigido': calculo.chaves_corrigido ? parseFloat(calculo.chaves_corrigido).toFixed(2) : '-',
        'Pagamento Total Líquido': calculo.pagamento_total_liquido ? parseFloat(calculo.pagamento_total_liquido).toFixed(2) : '-',
        'Pagamento Total': calculo.pagamento_total ? parseFloat(calculo.pagamento_total).toFixed(2) : '-',
        'Saldo Líquido': calculo.saldo_liquido ? parseFloat(calculo.saldo_liquido).toFixed(2) : '-',
        'Saldo Devedor': calculo.saldo_devedor ? parseFloat(calculo.saldo_devedor).toFixed(2) : '-'
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Configurar largura das colunas
      const colWidths = [
        { wch: 8 },   // Mês
        { wch: 15 },  // Taxa Mensal
        { wch: 18 },  // Correção Acumulada
        { wch: 15 },  // Parcela Base
        { wch: 18 },  // Parcela Corrigida
        { wch: 15 },  // Reforço Base
        { wch: 18 },  // Reforço Corrigido
        { wch: 15 },  // Chaves Base
        { wch: 18 },  // Chaves Corrigido
        { wch: 20 },  // Pagamento Total Líquido
        { wch: 18 },  // Pagamento Total
        { wch: 15 },  // Saldo Líquido
        { wch: 15 }   // Saldo Devedor
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Tabela de Amortização');

      // Gerar e baixar o arquivo
      const fileName = `tabela-amortizacao-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Feedback de sucesso
      alert('Tabela exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      alert('Erro ao exportar tabela. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando dados da tabela de amortização...</div>;
  }

  // Ordenar por mês
  const sortedCalculos = calculosProjecao?.sort((a: any, b: any) => a.mes - b.mes) || [];

  return (
    <Card className="shadow-sm w-full mx-auto">
      <Collapsible open={!isCollapsed} onOpenChange={() => setIsCollapsed(!isCollapsed)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#434BE6]" />
                Tabela de Amortização
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={exportToExcel}
                  disabled={isExporting || !calculosProjecao || calculosProjecao.length === 0}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isExporting ? 'Exportando...' : 'Exportar Excel'}
                </Button>
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Filtros apenas no desktop */}
            <div className="hidden md:block bg-gray-50 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Filtrar Colunas Visíveis</span>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-600">Dados:</span>
                  <div className="flex gap-4">
                    {columnGroups.dados.map(column => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`col-${column.id}`} 
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={() => toggleColumn(column.id)}
                        />
                        <Label htmlFor={`col-${column.id}`} className="text-xs flex items-center gap-1">
                          {column.icon}
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-600">Valores:</span>
                  <div className="flex gap-4">
                    {columnGroups.valores.map(column => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`col-${column.id}`} 
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={() => toggleColumn(column.id)}
                        />
                        <Label htmlFor={`col-${column.id}`} className="text-xs flex items-center gap-1">
                          {column.icon}
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-600">Saldos:</span>
                  <div className="flex gap-4">
                    {columnGroups.saldos.map(column => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`col-${column.id}`} 
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={() => toggleColumn(column.id)}
                        />
                        <Label htmlFor={`col-${column.id}`} className="text-xs flex items-center gap-1">
                          {column.icon}
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Tabela completa com cabeçalho fixo */}
            <div className="hidden md:block">
              <div className="overflow-x-auto w-full max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 border-b sticky left-0 bg-gray-50 z-20">
                        Mês
                      </th>
                      
                      {visibleColumns.includes('taxa') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 border-b">
                          Taxa Mensal<br />
                          <span className="text-[10px] text-gray-400">(%)</span>
                        </th>
                      )}
                      
                      {visibleColumns.includes('correcao') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 border-b">
                          Corr. Acum.<br />
                          <span className="text-[10px] text-gray-400">(%)</span>
                        </th>
                      )}

                      {visibleColumns.includes('parcela') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-indigo-600 border-b" colSpan={2}>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                            Parcela
                          </div>
                        </th>
                      )}

                      {visibleColumns.includes('reforco') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-green-600 border-b" colSpan={2}>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-600"></span>
                            Reforço
                          </div>
                        </th>
                      )}

                      {visibleColumns.includes('chaves') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-orange-600 border-b" colSpan={2}>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-orange-600"></span>
                            Chaves
                          </div>
                        </th>
                      )}

                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 border-b">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                          Pgto Total Líquido
                        </div>
                      </th>

                      <th className="py-3 px-4 text-left text-xs font-medium text-blue-600 border-b">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                          Pagamento Total
                        </div>
                      </th>

                      {visibleColumns.includes('saldoLiquido') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-green-600 border-b">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-600"></span>
                            Saldo Líquido
                          </div>
                        </th>
                      )}

                      {visibleColumns.includes('saldoDevedor') && (
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 border-b">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                            Saldo Devedor
                          </div>
                        </th>
                      )}
                    </tr>
                    
                    {/* Subheader para Base/Corrigida */}
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      <th className="py-2 px-4 border-b sticky left-0 bg-gray-50 z-20"></th>
                      {visibleColumns.includes('taxa') && <th className="py-2 px-4 border-b"></th>}
                      {visibleColumns.includes('correcao') && <th className="py-2 px-4 border-b"></th>}
                      
                      {visibleColumns.includes('parcela') && (
                        <>
                          <th className="py-2 px-4 border-b text-center">Base</th>
                          <th className="py-2 px-4 border-b text-center">Corrigida</th>
                        </>
                      )}
                      
                      {visibleColumns.includes('reforco') && (
                        <>
                          <th className="py-2 px-4 border-b text-center">Base</th>
                          <th className="py-2 px-4 border-b text-center">Corrigido</th>
                        </>
                      )}
                      
                      {visibleColumns.includes('chaves') && (
                        <>
                          <th className="py-2 px-4 border-b text-center">Base</th>
                          <th className="py-2 px-4 border-b text-center">Corrigido</th>
                        </>
                      )}
                      
                      <th className="py-2 px-4 border-b"></th>
                      <th className="py-2 px-4 border-b"></th>
                      {visibleColumns.includes('saldoLiquido') && <th className="py-2 px-4 border-b"></th>}
                      {visibleColumns.includes('saldoDevedor') && <th className="py-2 px-4 border-b"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCalculos.map((calculo: any, index: number) => (
                      <tr 
                        key={calculo.mes}
                        className={`
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} 
                          hover:bg-gray-100 transition-colors
                          ${isEntrada(calculo.mes) ? 'font-medium' : ''}
                        `}
                      >
                        <td className="py-2 px-4 text-xs border-b text-gray-700 sticky left-0 bg-inherit z-10">{calculo.mes}</td>
                        
                        {visibleColumns.includes('taxa') && (
                          <td className="py-2 px-4 text-xs border-b text-[#A16207] font-medium">
                            {calculo.mes === 0 ? '-' : `${parseFloat(calculo.taxaCorrecao)}%`}
                          </td>
                        )}
                        
                        {visibleColumns.includes('correcao') && (
                          <td className="py-2 px-4 text-xs border-b text-gray-500">
                            {calculo.mes === 0 ? '0.00%' : `${(parseFloat(calculo.taxaAcumulada) * 100 - 100).toFixed(2)}%`}
                          </td>
                        )}
                        
                        {visibleColumns.includes('parcela') && (
                          <>
                            <td className="py-2 px-4 text-xs border-b text-gray-600">
                              {calculo.mes === 0 
                                ? (parseFloat(calculo.valorEntrada) > 0 ? 'Entrada' : '-') 
                                : formatValue(calculo.parcelaBase)}
                            </td>
                            <td className="py-2 px-4 text-xs border-b text-gray-700">
                              {calculo.mes === 0 
                                ? formatValue(calculo.valorEntrada)
                                : formatValue(calculo.parcelaCorrigida)}
                            </td>
                          </>
                        )}
                        
                        {visibleColumns.includes('reforco') && (
                          <>
                            <td className="py-2 px-4 text-xs border-b text-gray-600">{formatValue(calculo.reforcoBase)}</td>
                            <td className="py-2 px-4 text-xs border-b text-gray-700">{formatValue(calculo.reforcoCorrigido)}</td>
                          </>
                        )}
                        
                        {visibleColumns.includes('chaves') && (
                          <>
                            <td className="py-2 px-4 text-xs border-b text-gray-600">{formatValue(calculo.valorChaves)}</td>
                            <td className="py-2 px-4 text-xs border-b text-gray-700">{formatValue(calculo.chavesCorrigido)}</td>
                          </>
                        )}
                        
                        <td className="py-2 px-4 text-xs border-b text-gray-600 font-medium">{formatValue(calculo.pagamentoTotalLiquido)}</td>
                        <td className="py-2 px-4 text-xs border-b text-black font-medium">{formatValue(calculo.pagamentoTotal)}</td>
                        
                        {visibleColumns.includes('saldoLiquido') && (
                          <td className="py-2 px-4 text-xs border-b text-gray-700">{formatValue(calculo.saldoLiquido)}</td>
                        )}
                        
                        {visibleColumns.includes('saldoDevedor') && (
                          <td className="py-2 px-4 text-xs border-b text-gray-700">{formatValue(calculo.saldoDevedorCorrigido)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Layout em cards responsivo */}
            <div className="md:hidden space-y-3">
              <div className="max-h-80 overflow-y-auto space-y-3">
                {sortedCalculos.map((calculo: any, index: number) => (
                  <div 
                    key={calculo.mes}
                    className="bg-white border rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                      <span className="font-medium text-sm text-gray-800">Mês {calculo.mes}</span>
                      {calculo.mes === 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Entrada</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Parcela Corrigida:</span>
                        <div className="font-medium text-gray-800">
                          {calculo.mes === 0 
                            ? formatValue(calculo.valorEntrada)
                            : formatValue(calculo.parcelaCorrigida)}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Pagamento Total:</span>
                        <div className="font-medium text-gray-800">{formatValue(calculo.pagamentoTotal)}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Reforço Corrigido:</span>
                        <div className="font-medium text-gray-800">{formatValue(calculo.reforcoCorrigido)}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Saldo Devedor:</span>
                        <div className="font-medium text-gray-800">{formatValue(calculo.saldoDevedorCorrigido)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AmortizationTable;