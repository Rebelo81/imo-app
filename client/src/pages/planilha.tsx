import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, Download, FileText, TrendingUp, DollarSign, Calendar, Percent, Eye, EyeOff, Filter, BarChart3, PieChart, LineChart, Printer, FileDown } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

// Tipos e interfaces
interface CalculationParams {
  valorImovel: number;
  valorEntrada: number;
  prazoMeses: number;
  taxaJuros: number;
  indiceCorrecao: number;
  adicionarReforcos: boolean;
  valorReforco: number;
  mesReforco: number;
  adicionarValorChaves: boolean;
  valorChaves: number;
  mesChaves: number;
}

interface ItemTabela {
  mes: number;
  correcaoMensal: number;
  correcaoAcumulada: number;
  valorParcela: number;
  valorParcelaCorrigido: number;
  saldoLiquido: number;
  saldoDevedor: number;
  entrada?: {
    valorBase: number;
    valorCorrigido: number;
  };
  reforco?: {
    valorBase: number;
    valorCorrigido: number;
  };
  chaves?: {
    valorBase: number;
    valorCorrigido: number;
  };
}

interface FiltrosTabela {
  mostrarReforcos: boolean;
  mostrarChaves: boolean;
  mostrarSaldoLiquido: boolean;
  mostrarSaldoDevedor: boolean;
}

interface ResultadosCalculos {
  valorTotalPago: number;
  valorTotalCorrigido: number;
  valorTotalJuros: number;
  valorTotalReforcos: number;
  valorTotalChaves: number;
  saldoFinalLiquido: number;
  saldoFinalDevedor: number;
}

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para formatar porcentagem
const formatPercentage = (value: number): string => {
  return `${value.toFixed(4)}%`;
};

// Cores para os gráficos
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function PlanilhaFinanciamento() {
  // Estados principais
  const [params, setParams] = useState<CalculationParams>({
    valorImovel: 500000,
    valorEntrada: 100000,
    prazoMeses: 120,
    taxaJuros: 0.8,
    indiceCorrecao: 0.5,
    adicionarReforcos: false,
    valorReforco: 0,
    mesReforco: 12,
    adicionarValorChaves: false,
    valorChaves: 0,
    mesChaves: 60
  });

  const [filtrosTabela, setFiltrosTabela] = useState<FiltrosTabela>({
    mostrarReforcos: true,
    mostrarChaves: true,
    mostrarSaldoLiquido: true,
    mostrarSaldoDevedor: true
  });

  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('calculadora');
  const printRef = useRef<HTMLDivElement>(null);

  // Cálculos principais
  const tabelaAmortizacao = useMemo(() => {
    const tabela: ItemTabela[] = [];
    const { valorImovel, valorEntrada, prazoMeses, taxaJuros, indiceCorrecao, adicionarReforcos, valorReforco, mesReforco, adicionarValorChaves, valorChaves, mesChaves } = params;
    
    const saldoInicial = valorImovel - valorEntrada;
    const taxaJurosMensal = taxaJuros / 100;
    const indiceCorrecaoMensal = indiceCorrecao / 100;
    
    // Cálculo da parcela usando a fórmula de Price
    const valorParcela = saldoInicial * (taxaJurosMensal * Math.pow(1 + taxaJurosMensal, prazoMeses)) / (Math.pow(1 + taxaJurosMensal, prazoMeses) - 1);
    
    let correcaoAcumulada = 0;
    let saldoLiquido = saldoInicial;
    
    // Mês 0 - Entrada
    tabela.push({
      mes: 0,
      correcaoMensal: 0,
      correcaoAcumulada: 0,
      valorParcela: 0,
      valorParcelaCorrigido: 0,
      saldoLiquido: saldoInicial,
      saldoDevedor: 0,
      entrada: {
        valorBase: valorEntrada,
        valorCorrigido: valorEntrada
      }
    });
    
    // Meses 1 até prazoMeses
    for (let mes = 1; mes <= prazoMeses; mes++) {
      correcaoAcumulada += indiceCorrecaoMensal;
      const fatorCorrecao = 1 + (correcaoAcumulada / 100);
      const valorParcelaCorrigido = valorParcela * fatorCorrecao;
      
      // Cálculo do saldo líquido
      if (mes === 1) {
        saldoLiquido = saldoInicial; // No mês 1, mantém o saldo inicial
      } else {
        // A partir do mês 2, subtrai o pagamento líquido do mês anterior
        const itemAnterior = tabela[mes - 1];
        let pagamentoLiquidoAnterior = itemAnterior.valorParcela;
        
        if (adicionarReforcos && itemAnterior.mes === mesReforco) {
          pagamentoLiquidoAnterior += valorReforco;
        }
        
        if (adicionarValorChaves && itemAnterior.mes === mesChaves) {
          pagamentoLiquidoAnterior += valorChaves;
        }
        
        saldoLiquido -= pagamentoLiquidoAnterior;
      }
      
      const saldoDevedor = saldoLiquido * fatorCorrecao;
      
      const item: ItemTabela = {
        mes,
        correcaoMensal: indiceCorrecaoMensal,
        correcaoAcumulada,
        valorParcela,
        valorParcelaCorrigido,
        saldoLiquido,
        saldoDevedor
      };
      
      // Adicionar reforços se aplicável
      if (adicionarReforcos && mes === mesReforco) {
        item.reforco = {
          valorBase: valorReforco,
          valorCorrigido: valorReforco * fatorCorrecao
        };
      }
      
      // Adicionar valor das chaves se aplicável
      if (adicionarValorChaves && mes === mesChaves) {
        item.chaves = {
          valorBase: valorChaves,
          valorCorrigido: valorChaves * fatorCorrecao
        };
      }
      
      tabela.push(item);
    }
    
    return tabela;
  }, [params]);

  // Cálculos dos resultados
  const resultados = useMemo((): ResultadosCalculos => {
    const valorTotalPago = tabelaAmortizacao.reduce((total, item) => {
      if (item.mes === 0) return total + (item.entrada?.valorBase || 0);
      return total + item.valorParcela + (item.reforco?.valorBase || 0) + (item.chaves?.valorBase || 0);
    }, 0);
    
    const valorTotalCorrigido = tabelaAmortizacao.reduce((total, item) => {
      if (item.mes === 0) return total + (item.entrada?.valorCorrigido || 0);
      return total + item.valorParcelaCorrigido + (item.reforco?.valorCorrigido || 0) + (item.chaves?.valorCorrigido || 0);
    }, 0);
    
    const valorTotalJuros = valorTotalPago - params.valorImovel;
    const valorTotalReforcos = tabelaAmortizacao.reduce((total, item) => total + (item.reforco?.valorBase || 0), 0);
    const valorTotalChaves = tabelaAmortizacao.reduce((total, item) => total + (item.chaves?.valorBase || 0), 0);
    
    const ultimoItem = tabelaAmortizacao[tabelaAmortizacao.length - 1];
    const saldoFinalLiquido = ultimoItem?.saldoLiquido || 0;
    const saldoFinalDevedor = ultimoItem?.saldoDevedor || 0;
    
    return {
      valorTotalPago,
      valorTotalCorrigido,
      valorTotalJuros,
      valorTotalReforcos,
      valorTotalChaves,
      saldoFinalLiquido,
      saldoFinalDevedor
    };
  }, [tabelaAmortizacao, params.valorImovel]);

  // Dados para gráficos
  const dadosGraficoPizza = useMemo(() => {
    const dados = [
      { name: 'Valor do Imóvel', value: params.valorImovel, color: COLORS[0] },
      { name: 'Juros Totais', value: resultados.valorTotalJuros, color: COLORS[1] }
    ];
    
    if (resultados.valorTotalReforcos > 0) {
      dados.push({ name: 'Reforços', value: resultados.valorTotalReforcos, color: COLORS[2] });
    }
    
    if (resultados.valorTotalChaves > 0) {
      dados.push({ name: 'Chaves', value: resultados.valorTotalChaves, color: COLORS[3] });
    }
    
    return dados;
  }, [params.valorImovel, resultados]);

  const dadosGraficoLinha = useMemo(() => {
    return tabelaAmortizacao.slice(1).map(item => ({
      mes: item.mes,
      saldoLiquido: item.saldoLiquido,
      saldoDevedor: item.saldoDevedor,
      valorParcela: item.valorParcela
    }));
  }, [tabelaAmortizacao]);

  // Funções de manipulação
  const handleParamChange = (key: keyof CalculationParams, value: number | boolean) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleFiltroChange = (key: keyof FiltrosTabela, value: boolean) => {
    setFiltrosTabela(prev => ({ ...prev, [key]: value }));
  };

  // Função para exportar PDF
  const exportarPDF = async () => {
    if (!printRef.current) return;
    
    setIsExporting(true);
    setIsPrintMode(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = printRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `planilha-financiamento-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };
      
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
      setIsPrintMode(false);
    }
  };

  // Função para exportar Excel
  const exportarExcel = () => {
    try {
      const dadosExcel = tabelaAmortizacao.map(item => {
        const linha: any = {
          'Mês': item.mes,
          'Correção Mensal (%)': item.correcaoMensal.toFixed(4),
          'Correção Acumulada (%)': item.correcaoAcumulada.toFixed(4),
          'Valor Parcela': item.valorParcela,
          'Valor Parcela Corrigido': item.valorParcelaCorrigido
        };
        
        if (item.entrada) {
          linha['Entrada'] = item.entrada.valorBase;
          linha['Entrada Corrigida'] = item.entrada.valorCorrigido;
        }
        
        if (item.reforco) {
          linha['Reforço'] = item.reforco.valorBase;
          linha['Reforço Corrigido'] = item.reforco.valorCorrigido;
        }
        
        if (item.chaves) {
          linha['Chaves'] = item.chaves.valorBase;
          linha['Chaves Corrigidas'] = item.chaves.valorCorrigido;
        }
        
        linha['Saldo Líquido'] = item.saldoLiquido;
        linha['Saldo Devedor'] = item.saldoDevedor;
        
        return linha;
      });
      
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tabela de Amortização');
      
      const fileName = `tabela-amortizacao-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Planilha de Financiamento Imobiliário
          </h1>
          <p className="text-gray-600">Sistema completo de cálculo e análise de financiamento</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calculadora" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculadora
            </TabsTrigger>
            <TabsTrigger value="resultados" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="graficos" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="tabela" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tabela
            </TabsTrigger>
          </TabsList>

          {/* Aba Calculadora */}
          <TabsContent value="calculadora">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Parâmetros do Financiamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Valor do Imóvel */}
                  <div className="space-y-2">
                    <Label htmlFor="valorImovel">Valor do Imóvel</Label>
                    <Input
                      id="valorImovel"
                      type="number"
                      value={params.valorImovel}
                      onChange={(e) => handleParamChange('valorImovel', Number(e.target.value))}
                      className="text-right"
                    />
                    <p className="text-sm text-gray-500">{formatCurrency(params.valorImovel)}</p>
                  </div>

                  {/* Valor da Entrada */}
                  <div className="space-y-2">
                    <Label htmlFor="valorEntrada">Valor da Entrada</Label>
                    <Input
                      id="valorEntrada"
                      type="number"
                      value={params.valorEntrada}
                      onChange={(e) => handleParamChange('valorEntrada', Number(e.target.value))}
                      className="text-right"
                    />
                    <p className="text-sm text-gray-500">
                      {formatCurrency(params.valorEntrada)} ({((params.valorEntrada / params.valorImovel) * 100).toFixed(1)}%)
                    </p>
                  </div>

                  {/* Prazo em Meses */}
                  <div className="space-y-2">
                    <Label htmlFor="prazoMeses">Prazo (meses)</Label>
                    <Input
                      id="prazoMeses"
                      type="number"
                      value={params.prazoMeses}
                      onChange={(e) => handleParamChange('prazoMeses', Number(e.target.value))}
                      className="text-right"
                    />
                    <p className="text-sm text-gray-500">{(params.prazoMeses / 12).toFixed(1)} anos</p>
                  </div>

                  {/* Taxa de Juros */}
                  <div className="space-y-2">
                    <Label htmlFor="taxaJuros">Taxa de Juros (% a.m.)</Label>
                    <Input
                      id="taxaJuros"
                      type="number"
                      step="0.01"
                      value={params.taxaJuros}
                      onChange={(e) => handleParamChange('taxaJuros', Number(e.target.value))}
                      className="text-right"
                    />
                    <p className="text-sm text-gray-500">{((Math.pow(1 + params.taxaJuros / 100, 12) - 1) * 100).toFixed(2)}% a.a.</p>
                  </div>

                  {/* Índice de Correção */}
                  <div className="space-y-2">
                    <Label htmlFor="indiceCorrecao">Índice de Correção (% a.m.)</Label>
                    <Input
                      id="indiceCorrecao"
                      type="number"
                      step="0.01"
                      value={params.indiceCorrecao}
                      onChange={(e) => handleParamChange('indiceCorrecao', Number(e.target.value))}
                      className="text-right"
                    />
                    <p className="text-sm text-gray-500">{((Math.pow(1 + params.indiceCorrecao / 100, 12) - 1) * 100).toFixed(2)}% a.a.</p>
                  </div>
                </div>

                <Separator />

                {/* Configurações Adicionais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurações Adicionais</h3>
                  
                  {/* Reforços */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="adicionarReforcos"
                        checked={params.adicionarReforcos}
                        onCheckedChange={(checked) => handleParamChange('adicionarReforcos', checked)}
                      />
                      <Label htmlFor="adicionarReforcos">Adicionar Reforços</Label>
                    </div>
                    
                    {params.adicionarReforcos && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="valorReforco">Valor do Reforço</Label>
                          <Input
                            id="valorReforco"
                            type="number"
                            value={params.valorReforco}
                            onChange={(e) => handleParamChange('valorReforco', Number(e.target.value))}
                            className="text-right"
                          />
                          <p className="text-sm text-gray-500">{formatCurrency(params.valorReforco)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mesReforco">Mês do Reforço</Label>
                          <Input
                            id="mesReforco"
                            type="number"
                            min="1"
                            max={params.prazoMeses}
                            value={params.mesReforco}
                            onChange={(e) => handleParamChange('mesReforco', Number(e.target.value))}
                            className="text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Valor das Chaves */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="adicionarValorChaves"
                        checked={params.adicionarValorChaves}
                        onCheckedChange={(checked) => handleParamChange('adicionarValorChaves', checked)}
                      />
                      <Label htmlFor="adicionarValorChaves">Adicionar Valor das Chaves</Label>
                    </div>
                    
                    {params.adicionarValorChaves && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="valorChaves">Valor das Chaves</Label>
                          <Input
                            id="valorChaves"
                            type="number"
                            value={params.valorChaves}
                            onChange={(e) => handleParamChange('valorChaves', Number(e.target.value))}
                            className="text-right"
                          />
                          <p className="text-sm text-gray-500">{formatCurrency(params.valorChaves)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mesChaves">Mês das Chaves</Label>
                          <Input
                            id="mesChaves"
                            type="number"
                            min="1"
                            max={params.prazoMeses}
                            value={params.mesChaves}
                            onChange={(e) => handleParamChange('mesChaves', Number(e.target.value))}
                            className="text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Resultados */}
          <TabsContent value="resultados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Valor Total Pago</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(resultados.valorTotalPago)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total com Correção</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(resultados.valorTotalCorrigido)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total de Juros</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(resultados.valorTotalJuros)}</p>
                    </div>
                    <Percent className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Final</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(resultados.saldoFinalDevedor)}</p>
                    </div>
                    <Calculator className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {(resultados.valorTotalReforcos > 0 || resultados.valorTotalChaves > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {resultados.valorTotalReforcos > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Reforços</p>
                          <p className="text-2xl font-bold text-orange-600">{formatCurrency(resultados.valorTotalReforcos)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resultados.valorTotalChaves > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Chaves</p>
                          <p className="text-2xl font-bold text-purple-600">{formatCurrency(resultados.valorTotalChaves)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Aba Gráficos */}
          <TabsContent value="graficos">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Pizza */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Composição do Investimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dadosGraficoPizza}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosGraficoPizza.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Linha */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Evolução dos Saldos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={dadosGraficoLinha}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="saldoLiquido" stroke="#10B981" name="Saldo Líquido" />
                        <Line type="monotone" dataKey="saldoDevedor" stroke="#EF4444" name="Saldo Devedor" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Tabela */}
          <TabsContent value="tabela">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tabela de Amortização
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={exportarExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button
                    onClick={exportarPDF}
                    disabled={isExporting}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {isExporting ? 'Exportando...' : 'Exportar PDF'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros da Tabela */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros de Visualização
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarReforcos"
                        checked={filtrosTabela.mostrarReforcos}
                        onCheckedChange={(checked) => handleFiltroChange('mostrarReforcos', checked as boolean)}
                      />
                      <Label htmlFor="mostrarReforcos" className="text-sm">Reforços</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarChaves"
                        checked={filtrosTabela.mostrarChaves}
                        onCheckedChange={(checked) => handleFiltroChange('mostrarChaves', checked as boolean)}
                      />
                      <Label htmlFor="mostrarChaves" className="text-sm">Chaves</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarSaldoLiquido"
                        checked={filtrosTabela.mostrarSaldoLiquido}
                        onCheckedChange={(checked) => handleFiltroChange('mostrarSaldoLiquido', checked as boolean)}
                      />
                      <Label htmlFor="mostrarSaldoLiquido" className="text-sm">Saldo Líquido</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarSaldoDevedor"
                        checked={filtrosTabela.mostrarSaldoDevedor}
                        onCheckedChange={(checked) => handleFiltroChange('mostrarSaldoDevedor', checked as boolean)}
                      />
                      <Label htmlFor="mostrarSaldoDevedor" className="text-sm">Saldo Devedor</Label>
                    </div>
                  </div>
                </div>

                {/* Tabela de Amortização */}
                <div ref={printRef} data-print-mode={isPrintMode}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Mês</TableHead>
                          <TableHead className="text-center">Correção Mensal (%)</TableHead>
                          <TableHead className="text-center">Correção Acumulada (%)</TableHead>
                          <TableHead className="text-center">Valor Parcela</TableHead>
                          <TableHead className="text-center">Parcela Corrigida</TableHead>
                          
                          {/* Colunas condicionais para entrada */}
                          <TableHead className="text-center">Entrada</TableHead>
                          <TableHead className="text-center">Entrada Corrigida</TableHead>
                          
                          {/* Colunas condicionais para reforços */}
                          {(filtrosTabela.mostrarReforcos || isPrintMode) && params.adicionarReforcos && (
                            <>
                              <TableHead className="text-center bg-green-50">Reforço</TableHead>
                              <TableHead className="text-center bg-green-50">Reforço Corrigido</TableHead>
                            </>
                          )}
                          
                          {/* Colunas condicionais para chaves */}
                          {(filtrosTabela.mostrarChaves || isPrintMode) && params.adicionarValorChaves && (
                            <>
                              <TableHead className="text-center bg-orange-50">Chaves</TableHead>
                              <TableHead className="text-center bg-orange-50">Chaves Corrigidas</TableHead>
                            </>
                          )}
                          
                          <TableHead className="text-center">Pagamento Total</TableHead>
                          <TableHead className="text-center bg-blue-50">Pagamento Total Líquido</TableHead>
                          
                          {(filtrosTabela.mostrarSaldoLiquido || isPrintMode) && (
                            <TableHead className="text-center bg-green-50">Saldo Líquido</TableHead>
                          )}
                          
                          {(filtrosTabela.mostrarSaldoDevedor || isPrintMode) && (
                            <TableHead className="text-center bg-gray-50">Saldo Devedor</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          return tabelaAmortizacao.map((item) => {
                            const isEntrada = item.mes === 0;
                            const valorReforco = item.reforco?.valorBase || 0;
                            const valorReforcoCorrigido = item.reforco?.valorCorrigido || 0;
                            const valorChaves = item.chaves?.valorBase || 0;
                            const valorChavesCorrigido = item.chaves?.valorCorrigido || 0;
                            const valorParcela = isEntrada ? 0 : item.valorParcela;
                            const valorParcelaCorrigido = isEntrada ? 0 : item.valorParcelaCorrigido;
                            
                            // Cálculo do pagamento total com correção
                            const pagamentoTotal = isEntrada 
                              ? item.entrada?.valorCorrigido || 0
                              : valorParcelaCorrigido + valorReforcoCorrigido + valorChavesCorrigido;
                            
                            return (
                              <TableRow key={item.mes} className={isEntrada ? 'bg-blue-50/30' : ''}>
                                <TableCell className={`text-center font-medium ${isPrintMode ? 'print-table-cell' : ''}`}>
                                  {item.mes}
                                  {isEntrada && <Badge variant="secondary" className="ml-2">Entrada</Badge>}
                                </TableCell>
                                
                                <TableCell className={`text-center ${isPrintMode ? 'print-table-cell' : ''}`}>
                                  {isEntrada ? '-' : formatPercentage(item.correcaoMensal)}
                                </TableCell>
                                
                                <TableCell className={`text-center ${isPrintMode ? 'print-table-cell' : ''}`}>
                                  {isEntrada ? '-' : formatPercentage(item.correcaoAcumulada)}
                                </TableCell>
                                
                                <TableCell className={`text-right ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada ? '-' : formatCurrency(valorParcela)}
                                </TableCell>
                                
                                <TableCell className={`text-right ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada ? '-' : formatCurrency(valorParcelaCorrigido)}
                                </TableCell>
                                
                                {/* Entrada */}
                                <TableCell className={`text-right ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada ? formatCurrency(item.entrada?.valorBase || 0) : '-'}
                                </TableCell>
                                
                                <TableCell className={`text-right ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada ? formatCurrency(item.entrada?.valorCorrigido || 0) : '-'}
                                </TableCell>
                                
                                {/* Células para reforços */}
                                {(filtrosTabela.mostrarReforcos || isPrintMode) && params.adicionarReforcos && (
                                  <>
                                    <TableCell className={`py-1 text-right bg-green-50/10 border-r border-green-100/30 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                      {formatCurrency(valorReforco)}
                                    </TableCell>
                                    <TableCell className={`py-1 text-right bg-green-50/20 border-r border-green-100 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                      {formatCurrency(valorReforcoCorrigido)}
                                    </TableCell>
                                  </>
                                )}

                                {/* Células para chaves */}
                                {(filtrosTabela.mostrarChaves || isPrintMode) && params.adicionarValorChaves && (
                                  <>
                                    <TableCell className={`py-1 text-right bg-orange-50/10 border-r border-orange-100/30 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                      {formatCurrency(valorChaves)}
                                    </TableCell>
                                    <TableCell className={`py-1 text-right bg-orange-50/20 border-r border-orange-100 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                      {formatCurrency(valorChavesCorrigido)}
                                    </TableCell>
                                  </>
                                )}

                                {/* Pagamento Total com correção */}
                                <TableCell className={`font-medium py-1 text-right border-r border-gray-100 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada 
                                    ? formatCurrency(item.entrada?.valorBase || 0) 
                                    : formatCurrency(pagamentoTotal || 0)
                                  }
                                </TableCell>

                                {/* Pagamento Total Líquido (sem correção) */}
                                <TableCell className={`font-medium py-1 text-right border-r border-gray-100 bg-blue-50/5 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                  {isEntrada 
                                    ? formatCurrency(item.entrada?.valorBase || 0) 
                                    : formatCurrency(
                                        (valorParcela || 0) + 
                                        (valorReforco || 0) + 
                                        (valorChaves || 0)
                                      )
                                  }
                                </TableCell>

                                {(filtrosTabela.mostrarSaldoLiquido || isPrintMode) && (
                                  <TableCell className={`py-1 text-right bg-green-50/10 border-r border-green-100 font-medium text-gray-700 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                    <TooltipProvider>
                                      <UITooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-help">
                                            {formatCurrency(item.saldoLiquido || 0)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="font-medium">Saldo Líquido</p>
                                          {item.mes === 0 && (
                                            <p>SL<sub>0</sub> = Valor do imóvel - Entrada<br/>
                                              Saldo líquido no mês 0 = {formatCurrency(params.valorImovel)} - {formatCurrency(params.valorEntrada)} = {formatCurrency(params.valorImovel - params.valorEntrada)}</p>
                                          )}
                                          {item.mes === 1 && (
                                            <p>SL<sub>1</sub> = SL<sub>0</sub><br/>
                                              Saldo líquido no mês 1 é igual ao do mês 0 (não subtrai pagamentos do mês 0)</p>
                                          )}
                                          {item.mes > 1 && (
                                            <p>SL<sub>{item.mes}</sub> = SL<sub>{item.mes - 1}</sub> - Pagamento Total Líquido<sub>{item.mes - 1}</sub><br/>
                                              Saldo líquido no mês {item.mes} = saldo líquido do mês {item.mes - 1} menos o pagamento líquido do mês {item.mes - 1}</p>
                                          )}
                                        </TooltipContent>
                                      </UITooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                )}

                                {(filtrosTabela.mostrarSaldoDevedor || isPrintMode) && (
                                  <TableCell className={`py-1 text-right bg-gray-50/30 border-r border-gray-200 font-medium text-gray-700 ${isPrintMode ? 'print-table-cell print-money-cell' : ''}`}>
                                    <TooltipProvider>
                                      <UITooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-help">
                                            {item.mes === 0 
                                              ? "-"
                                              : formatCurrency(item.saldoDevedor || 0)
                                            }
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="font-medium">Saldo Devedor Corrigido</p>
                                          {item.mes === 0 && (
                                            <p>No mês 0 não há saldo devedor corrigido (deixa-se em branco)</p>
                                          )}
                                          {item.mes >= 1 && (
                                            <p>SC<sub>{item.mes}</sub> = SL<sub>{item.mes}</sub> × (1 + CA<sub>{item.mes}</sub>)<br/>
                                              Saldo corrigido no mês {item.mes} = saldo líquido do mês {item.mes} × (1 + {(item.correcaoAcumulada / 100).toFixed(4)})</p>
                                          )}
                                        </TooltipContent>
                                      </UITooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// CSS específico para modo de impressão/PDF - quebras de página e layout dos gráficos
const printStyles = `
@media print, screen {
  /* Classe para quebras de página */
  .page-break {
    page-break-before: always !important;
    break-before: page !important;
    display: block !important;
    height: 1px !important;
    width: 100% !important;
  }

  /* Container dos gráficos em modo impressão */
  [data-print-mode="true"] .print-chart-container {
    width: 100% !important;
    height: 140px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: visible !important;
    max-width: 100% !important;
  }

  [data-print-mode="true"] .print-chart-container .recharts-wrapper {
    width: 280px !important;
    height: 140px !important;
    overflow: visible !important;
  }

  /* Garantir que gráficos sejam visíveis */
  [data-print-mode="true"] .recharts-pie-chart,
  [data-print-mode="true"] .recharts-pie,
  [data-print-mode="true"] .recharts-pie-sector {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }

  /* Ajustar legendas para modo print */
  [data-print-mode="true"] .recharts-legend-wrapper {
    font-size: 9px !important;
    padding-left: 15px !important;
    margin-left: 10px !important;
    border-left: 1px dashed #d8dbff !important;
  }

  /* Ajustar texto das legendas */
  [data-print-mode="true"] .recharts-legend-item-text {
    font-size: 9px !important;
    line-height: 1.2 !important;
  }

  /* Espaçamento entre itens da legenda */
  [data-print-mode="true"] .recharts-legend-item {
    margin-bottom: 4px !important;
  }

  /* Otimizar gráfico de linha do fluxo financeiro em modo print */
  [data-print-mode="true"] .financial-flow-chart {
    height: 200px !important;
    margin-top: 20px !important;
  }

  [data-print-mode="true"] .financial-flow-chart .recharts-wrapper {
    width: 100% !important;
    height: 200px !important;
  }
}
`;

// Adiciona os estilos ao head se estivermos em modo de impressão
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const existingStyle = document.getElementById('print-chart-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'print-chart-styles';
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
}