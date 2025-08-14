import React, { useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Home, 
  Calculator, 
  ChevronRight, 
  BarChart3, 
  PercentIcon, 
  Calendar,
  Repeat, 
  CheckCircle2, 
  CreditCard, 
  PlusCircle,
  FileSpreadsheet,
  Edit,
  Trash2,
  Key,
  Info
} from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// Nova versão melhorada do formulário
interface FinanciamentoFormProps {
  valorImovel: number;
  setValorImovel: (value: number) => void;
  tipoEntrada: string;
  setTipoEntrada: (value: string) => void;
  valorEntrada: number;
  setValorEntrada: (value: number) => void;
  percentualEntrada: number;
  setPercentualEntrada: (value: number) => void;
  prazoEntrega: number;
  setPrazoEntrega: (value: number) => void;
  tipoParcelamento: string;
  setTipoParcelamento: (value: string) => void;
  prazoPagamento: number;
  setPrazoPagamento: (value: number) => void;
  correcaoMensalAteChaves: number;
  setCorrecaoMensalAteChaves: (value: number) => void;
  correcaoMensalAposChaves: number;
  setCorrecaoMensalAposChaves: (value: number) => void;
  tipoIndiceAteChaves: string;
  setTipoIndiceAteChaves: (value: string) => void;
  tipoIndiceAposChaves: string;
  setTipoIndiceAposChaves: (value: string) => void;
  adicionarReforcos: boolean;
  setAdicionarReforcos: (value: boolean) => void;
  periodicidadeReforco: string;
  setPeriodicidadeReforco: (value: string) => void;
  valorReforco: number;
  setValorReforco: (value: number) => void;
  adicionarValorChaves: boolean;
  setAdicionarValorChaves: (value: boolean) => void;
  valorChaves: number;
  setValorChaves: (value: number) => void;
  parcelasPersonalizadas: {mes: number, valor: number}[];
  novoMes: number;
  setNovoMes: (value: number) => void;
  novoValor: number;
  setNovoValor: (value: number) => void;
  adicionarParcelaPersonalizada: () => void;
  removerParcelaPersonalizada: (index: number) => void;
  valorFinanciado: number;
  valorParcela: number;
  infoReforcos: any;
  handleCalcular: (isManualClick?: boolean) => void;
}

export function FinanciamentoForm({
  valorImovel,
  setValorImovel,
  tipoEntrada,
  setTipoEntrada,
  valorEntrada,
  setValorEntrada,
  percentualEntrada,
  setPercentualEntrada,
  prazoEntrega,
  setPrazoEntrega,
  tipoParcelamento,
  setTipoParcelamento,
  prazoPagamento,
  setPrazoPagamento,
  correcaoMensalAteChaves,
  setCorrecaoMensalAteChaves,
  correcaoMensalAposChaves,
  setCorrecaoMensalAposChaves,
  tipoIndiceAteChaves,
  setTipoIndiceAteChaves,
  tipoIndiceAposChaves,
  setTipoIndiceAposChaves,
  adicionarReforcos,
  setAdicionarReforcos,
  periodicidadeReforco,
  setPeriodicidadeReforco,
  valorReforco,
  setValorReforco,
  adicionarValorChaves,
  setAdicionarValorChaves,
  valorChaves,
  setValorChaves,
  parcelasPersonalizadas,
  novoMes,
  setNovoMes,
  novoValor,
  setNovoValor,
  adicionarParcelaPersonalizada,
  removerParcelaPersonalizada,
  valorFinanciado,
  valorParcela,
  infoReforcos,
  handleCalcular
}: FinanciamentoFormProps) {
  // Query para buscar índices financeiros
  const { data: financialIndexes } = useQuery({
    queryKey: ['/api/financial-indexes'],
    enabled: true
  }) as { data: any };

  // Função para lidar com mudanças nos índices
  const handleIndexChange = (value: string, fieldType: 'ate' | 'apos') => {
    if (value === "Personalizado") {
      // Mantém valor atual quando seleciona personalizado
      if (fieldType === 'ate') {
        setTipoIndiceAteChaves(value);
      } else {
        setTipoIndiceAposChaves(value);
      }
      return;
    }

    // Mapeia o valor selecionado para a chave correta do objeto
    let indexKey = '';
    if (value === "INCC-M") indexKey = 'incc';
    else if (value === "IGP-M") indexKey = 'igpm';
    else if (value === "IPCA") indexKey = 'ipca';
    else if (value === "CUB-SC") indexKey = 'cub_sc';

    // Busca o valor do índice selecionado no objeto
    const indexData = financialIndexes?.[indexKey];

    if (indexData && typeof indexData.average === 'number') {
      const averageValue = parseFloat(indexData.average.toFixed(2));
      
      if (fieldType === 'ate') {
        setCorrecaoMensalAteChaves(averageValue);
        setTipoIndiceAteChaves(value);
      } else {
        setCorrecaoMensalAposChaves(averageValue);
        setTipoIndiceAposChaves(value);
      }
    }
  };

  // useEffect para definir valores padrão automaticamente
  useEffect(() => {
    console.log('=== USEEFFECT PLANILHA_FORM ===');
    console.log('financialIndexes:', financialIndexes);
    console.log('tipoIndiceAteChaves:', tipoIndiceAteChaves);
    console.log('tipoIndiceAposChaves:', tipoIndiceAposChaves);
    
    if (financialIndexes) {
      // Define INCC-M como padrão para correção até chaves se ainda não foi definido
      if ((!tipoIndiceAteChaves || tipoIndiceAteChaves === '') && financialIndexes?.incc && typeof financialIndexes.incc.average === 'number') {
        console.log('Definindo INCC-M como padrão para correção até chaves');
        const averageValue = parseFloat(financialIndexes.incc.average.toFixed(2));
        setCorrecaoMensalAteChaves(averageValue);
        setTipoIndiceAteChaves("INCC-M");
      }
      
      // Define IGP-M como padrão para correção após chaves se ainda não foi definido
      if ((!tipoIndiceAposChaves || tipoIndiceAposChaves === '') && financialIndexes?.igpm && typeof financialIndexes.igpm.average === 'number') {
        console.log('Definindo IGP-M como padrão para correção após chaves');
        const averageValue = parseFloat(financialIndexes.igpm.average.toFixed(2));
        setCorrecaoMensalAposChaves(averageValue);
        setTipoIndiceAposChaves("IGP-M");
      }
    }
  }, [financialIndexes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
      {/* Dados do Financiamento (2/3 da tela) */}
      <div className="md:col-span-2">
        <Card className="h-full shadow-sm border-gray-200">
          <CardHeader className="bg-gradient-to-r from-[#434BE6]/5 to-white border-b pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Home className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
              <span className="hidden sm:inline">Dados do Financiamento</span>
              <span className="sm:hidden">Financiamento</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              <span className="hidden md:inline">Preencha os dados para calcular o parcelamento</span>
              <span className="md:hidden">Dados do parcelamento</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 pt-4 md:pt-6 px-2 md:px-6">
            {/* Dados básicos */}
            <div className="grid grid-cols-1 gap-2 md:gap-3 py-1 md:py-2">
              <div className="space-y-1 mx-auto w-full md:w-[70%]">
                <Label htmlFor="valorImovel" className="flex items-center gap-1 md:gap-2 text-xs md:text-[14px] mb-1 justify-center">
                  <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                  <span className="hidden sm:inline">Valor do Imóvel</span>
                  <span className="sm:hidden">Valor Imóvel</span>
                </Label>
                <Input
                  id="valorImovel"
                  type="text"
                  value={`R$ ${valorImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  onChange={(e) => {
                    console.log('=== ONCHANGE VALOR IMOVEL ===');
                    console.log('Stack trace:', new Error().stack);
                    const value = e.target.value.replace(/\D/g, '');
                    setValorImovel(Number(value) / 100);
                  }}
                  className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px] w-full md:w-[90%] mx-auto"
                />
              </div>

              <div className="space-y-1 mx-auto w-full md:w-[70%]">
                <Label className="flex items-center gap-1 md:gap-2 text-xs md:text-[14px] mb-1 justify-center">
                  <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                  <span className="hidden sm:inline">Valor de Entrada</span>
                  <span className="sm:hidden">Entrada</span>
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                  <Select
                    value={tipoEntrada}
                    onValueChange={(value) => setTipoEntrada(value as any)}
                  >
                    <SelectTrigger className="w-[100px] md:w-[120px] bg-gray-50 border-gray-300 shadow-sm h-8 md:h-9 text-xs md:text-[14px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor">Em R$</SelectItem>
                      <SelectItem value="percentual">Em %</SelectItem>
                    </SelectContent>
                  </Select>

                  {tipoEntrada === 'valor' ? (
                    <Input
                      type="text"
                      value={`R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setValorEntrada(Number(value) / 100);
                      }}
                      className="text-center flex-1 bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                    />
                  ) : (
                    <div className="flex-1 flex items-center gap-1 w-full">
                      <Input
                        type="number"
                        value={percentualEntrada}
                        onChange={(e) => setPercentualEntrada(Number(e.target.value))}
                        className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                      />
                      <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 md:px-3 h-8 md:h-9 rounded-r-md border border-l-0 border-gray-300 text-xs md:text-[14px]">
                        %
                      </div>
                    </div>
                  )}
                </div>
              </div>
            
              <div className="space-y-1 mx-auto w-full md:w-[70%]">
                <Label htmlFor="prazoEntrega" className="flex items-center gap-1 md:gap-2 justify-center text-xs md:text-[14px] mb-1">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                  <span className="hidden sm:inline">Prazo de Entrega</span>
                  <span className="sm:hidden">Entrega</span>
                </Label>
                <div className="flex items-center w-full md:w-[90%] mx-auto">
                  <Input
                    id="prazoEntrega"
                    type="number"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(Number(e.target.value))}
                    className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                  />
                  <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 md:px-3 h-8 md:h-9 rounded-r-md border border-l-0 border-gray-300 text-xs md:text-[14px]">
                    meses
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 md:mt-3 mb-2 md:mb-3">
              <Label className="mb-1 block flex items-center gap-1 md:gap-2 text-xs md:text-[14px] justify-center">
                <Repeat className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                <span className="hidden sm:inline">Tipo de Parcelamento</span>
                <span className="sm:hidden">Parcelamento</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <Card 
                  className={`cursor-pointer hover:border-[#434BE6] transition-all ${tipoParcelamento === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-300 shadow-sm'}`}
                  onClick={() => setTipoParcelamento('automatico')}
                >
                  <CardContent className="p-2 md:p-3 flex items-start gap-2">
                    <div className={`rounded-full h-3 w-3 md:h-4 md:w-4 mt-0.5 flex items-center justify-center border-2 ${tipoParcelamento === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/10' : 'border-gray-300'}`}>
                      {tipoParcelamento === 'automatico' && <div className="rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#434BE6]"></div>}
                    </div>
                    <div>
                      <h4 className="font-medium text-xs md:text-[14px] mb-0.5">
                        <span className="hidden sm:inline">Parcelamento Automático</span>
                        <span className="sm:hidden">Automático</span>
                      </h4>
                      <p className="text-[10px] md:text-[12px] text-muted-foreground">
                        <span className="hidden md:inline">Sistema calcula parcelas de valor fixo</span>
                        <span className="md:hidden">Valor fixo</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer hover:border-[#434BE6] transition-all ${tipoParcelamento === 'personalizado' ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-300 shadow-sm'}`}
                  onClick={() => setTipoParcelamento('personalizado')}
                >
                  <CardContent className="p-2 md:p-3 flex items-start gap-2">
                    <div className={`rounded-full h-3 w-3 md:h-4 md:w-4 mt-0.5 flex items-center justify-center border-2 ${tipoParcelamento === 'personalizado' ? 'border-[#434BE6] bg-[#434BE6]/10' : 'border-gray-300'}`}>
                      {tipoParcelamento === 'personalizado' && <div className="rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#434BE6]"></div>}
                    </div>
                    <div>
                      <h4 className="font-medium text-xs md:text-[14px] mb-0.5">
                        <span className="hidden sm:inline">Parcelamento Personalizado</span>
                        <span className="sm:hidden">Personalizado</span>
                      </h4>
                      <p className="text-[10px] md:text-[12px] text-muted-foreground">
                        <span className="hidden md:inline">Defina manualmente cada parcela</span>
                        <span className="md:hidden">Manual</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Campos específicos para cada tipo de parcelamento */}
            {tipoParcelamento === 'automatico' ? (
              <div className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                {/* Prazo centralizado */}
                <div className="flex flex-col items-center justify-center mb-2 md:mb-3">
                  <div className="w-full md:w-2/3 space-y-1">
                    <Label htmlFor="prazoPagamento" className="flex items-center gap-1 md:gap-2 justify-center text-xs md:text-[14px] mb-1">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                      <span className="hidden sm:inline">Prazo de Pagamento (meses)</span>
                      <span className="sm:hidden">Prazo Pagamento</span>
                    </Label>
                    <div className="flex items-center">
                      <Input
                        id="prazoPagamento"
                        type="number"
                        value={prazoPagamento}
                        onChange={(e) => setPrazoPagamento(Number(e.target.value))}
                        className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                      />
                      <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 md:px-3 h-8 md:h-9 rounded-r-md border border-l-0 border-gray-300 text-xs md:text-[14px]">
                        meses
                      </div>
                    </div>
                  </div>
                </div>

                {/* Correções na linha abaixo */}
                <div className="mb-3 md:mb-4 border-t border-gray-100 pt-2 md:pt-3">
                  <TooltipProvider>
                    <h3 className="text-xs md:text-[14px] font-medium text-center mb-2 text-[#434BE6]/80 flex items-center justify-center gap-1">
                      <span className="hidden sm:inline">Índices de Correção</span>
                      <span className="sm:hidden">Correções</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]/60 hover:text-[#434BE6] cursor-help transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="max-w-xs bg-slate-900 text-white text-sm p-3 rounded-lg shadow-lg border-0"
                        >
                          <p>💡 Ao selecionar um índice financeiro, o valor será preenchido com a média dos últimos 12 meses. Ou você pode inserir um valor personalizado.</p>
                        </TooltipContent>
                      </Tooltip>
                    </h3>
                  </TooltipProvider>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="correcaoAteChaves" className="flex items-center gap-1 md:gap-2 text-xs md:text-[14px]">
                        <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                        <span className="hidden sm:inline">Correção até chaves</span>
                        <span className="sm:hidden">Até chaves</span>
                      </Label>
                      <div className="flex gap-1 md:gap-2">
                        <Select
                          value={tipoIndiceAteChaves}
                          onValueChange={(value: any) => handleIndexChange(value, 'ate')}
                        >
                          <SelectTrigger className="w-[100px] md:w-[140px] bg-[#434BE6]/5 border-gray-300 shadow-sm focus:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]">
                            <SelectValue placeholder="Índice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Personalizado">Personalizado</SelectItem>
                            <SelectItem value="INCC-M">INCC-M</SelectItem>
                            <SelectItem value="IGP-M">IGP-M</SelectItem>
                            <SelectItem value="IPCA">IPCA</SelectItem>
                            <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="correcaoAteChaves"
                          type="number"
                          step="0.01"
                          value={correcaoMensalAteChaves}
                          onChange={(e) => {
                            setCorrecaoMensalAteChaves(Number(e.target.value));
                            setTipoIndiceAteChaves("personalizado");
                          }}
                          className="text-right flex-1 bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                        />
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-1 md:px-3 h-8 md:h-9 rounded-r-md border border-gray-300 text-xs md:text-[14px]">
                          % a.m.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="correcaoAposChaves" className="flex items-center gap-1 md:gap-2 text-xs md:text-[14px]">
                        <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                        <span className="hidden sm:inline">Correção após chaves</span>
                        <span className="sm:hidden">Após chaves</span>
                      </Label>
                      <div className="flex gap-1 md:gap-2">
                        <Select
                          value={tipoIndiceAposChaves}
                          onValueChange={(value: any) => handleIndexChange(value, 'apos')}
                        >
                          <SelectTrigger className="w-[100px] md:w-[140px] bg-[#434BE6]/5 border-gray-300 shadow-sm focus:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]">
                            <SelectValue placeholder="Índice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Personalizado">Personalizado</SelectItem>
                            <SelectItem value="INCC-M">INCC-M</SelectItem>
                            <SelectItem value="IGP-M">IGP-M</SelectItem>
                            <SelectItem value="IPCA">IPCA</SelectItem>
                            <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="correcaoAposChaves"
                          type="number"
                          step="0.01"
                          value={correcaoMensalAposChaves}
                          onChange={(e) => {
                            setCorrecaoMensalAposChaves(Number(e.target.value));
                            setTipoIndiceAposChaves("personalizado");
                          }}
                          className="text-right flex-1 bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-8 md:h-9 text-xs md:text-[14px]"
                        />
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-1 md:px-3 h-8 md:h-9 rounded-r-md border border-gray-300 text-xs md:text-[14px]">
                          % a.m.
                        </div>
                      </div>
                    </div>
                  </div>
                  

                </div>

                <div className="mb-3 bg-[#434BE6]/5 p-3 rounded-lg border border-[#434BE6]/20 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-[#434BE6]" />
                    <span className="text-gray-800 font-medium text-[14px]">Adicionar Reforços/Balões</span>
                  </div>
                  <div className="relative mt-1 flex items-center justify-center">
                    <label
                      htmlFor="adicionarReforcos"
                      className={`relative inline-flex h-6 w-12 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out ${adicionarReforcos ? 'bg-[#434BE6]' : 'bg-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        id="adicionarReforcos"
                        className="peer sr-only"
                        checked={adicionarReforcos}
                        onChange={(e) => setAdicionarReforcos(e.target.checked)}
                      />
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ease-in-out ${
                          adicionarReforcos ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </label>
                    <span className="ml-2 text-[12px] font-medium text-gray-800">
                      {adicionarReforcos ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  
                  {/* Conteúdo adicional dentro do card para reforços */}
                  {adicionarReforcos && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#434BE6]/10 animate-in fade-in">
                      <div className="space-y-1">
                        <Label htmlFor="periodicidadeReforco" className="flex items-center gap-2 text-[14px]">
                          <Calendar className="h-4 w-4 text-[#434BE6]" />
                          Periodicidade
                        </Label>
                        <Select
                          value={periodicidadeReforco}
                          onValueChange={(value) => setPeriodicidadeReforco(value as any)}
                        >
                          <SelectTrigger className="bg-gray-50 border-gray-300 shadow-sm h-9 focus-visible:ring-[#434BE6] text-[14px]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bimestral">Bimestral</SelectItem>
                            <SelectItem value="trimestral">Trimestral</SelectItem>
                            <SelectItem value="semestral">Semestral</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="valorReforco" className="flex items-center gap-2 text-[14px]">
                          <CreditCard className="h-4 w-4 text-[#434BE6]" />
                          Valor do reforço
                        </Label>
                        <Input
                          id="valorReforco"
                          type="text"
                          value={`R$ ${valorReforco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setValorReforco(Number(value) / 100);
                          }}
                          className="text-center bg-gray-50 border-gray-300 shadow-sm h-9 focus-visible:ring-[#434BE6] text-[14px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3 bg-[#434BE6]/5 p-3 rounded-lg border border-[#434BE6]/20 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-[#434BE6]" />
                    <span className="text-gray-800 font-medium text-[14px]">Adicionar Valor nas Chaves</span>
                  </div>
                  <div className="relative mt-1 flex items-center justify-center">
                    <label
                      htmlFor="adicionarValorChaves"
                      className={`relative inline-flex h-6 w-12 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out ${adicionarValorChaves ? 'bg-[#434BE6]' : 'bg-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        id="adicionarValorChaves"
                        className="peer sr-only"
                        checked={adicionarValorChaves}
                        onChange={(e) => setAdicionarValorChaves(e.target.checked)}
                      />
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ease-in-out ${
                          adicionarValorChaves ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </label>
                    <span className="ml-2 text-[12px] font-medium text-gray-800">
                      {adicionarValorChaves ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  
                  {/* Conteúdo adicional dentro do card para valor nas chaves */}
                  {adicionarValorChaves && (
                    <div className="mt-3 pt-3 border-t border-[#434BE6]/10 animate-in fade-in">
                      <div className="space-y-1">
                        <Label htmlFor="valorChaves" className="flex items-center gap-2 text-[14px]">
                          <CreditCard className="h-4 w-4 text-[#434BE6]" />
                          Valor nas Chaves
                        </Label>
                        <Input
                          id="valorChaves"
                          type="text"
                          value={`R$ ${valorChaves.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setValorChaves(Number(value) / 100);
                          }}
                          className="text-center max-w-xs bg-gray-50 border-gray-300 shadow-sm h-9 focus-visible:ring-[#434BE6] text-[14px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="correcaoAteChaves" className="flex items-center gap-2 text-[14px]">
                      <PercentIcon className="h-4 w-4 text-[#434BE6]" />
                      Correção até chaves
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={tipoIndiceAteChaves}
                        onValueChange={(value: any) => handleIndexChange(value, 'ate')}
                      >
                        <SelectTrigger className="w-[140px] bg-[#434BE6]/5 border-gray-300 shadow-sm focus:ring-[#434BE6] h-9 text-[14px]">
                          <SelectValue placeholder="Índice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personalizado">Personalizado</SelectItem>
                          <SelectItem value="INCC-M">INCC-M</SelectItem>
                          <SelectItem value="IGP-M">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="correcaoAteChaves"
                        type="number"
                        step="0.01"
                        value={correcaoMensalAteChaves}
                        onChange={(e) => {
                          setCorrecaoMensalAteChaves(Number(e.target.value));
                          setTipoIndiceAteChaves("personalizado");
                        }}
                        className="text-right flex-1 bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                      />
                      <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-3 h-9 rounded-r-md border border-gray-300 text-[14px]">
                        % a.m.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="correcaoAposChaves" className="flex items-center gap-2 text-[14px]">
                      <PercentIcon className="h-4 w-4 text-[#434BE6]" />
                      Correção após chaves
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={tipoIndiceAposChaves}
                        onValueChange={(value: any) => handleIndexChange(value, 'apos')}
                      >
                        <SelectTrigger className="w-[140px] bg-[#434BE6]/5 border-gray-300 shadow-sm focus:ring-[#434BE6] h-9 text-[14px]">
                          <SelectValue placeholder="Índice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personalizado">Personalizado</SelectItem>
                          <SelectItem value="INCC-M">INCC-M</SelectItem>
                          <SelectItem value="IGP-M">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="correcaoAposChaves"
                        type="number"
                        step="0.01"
                        value={correcaoMensalAposChaves}
                        onChange={(e) => {
                          setCorrecaoMensalAposChaves(Number(e.target.value));
                          setTipoIndiceAposChaves("personalizado");
                        }}
                        className="text-right flex-1 bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                      />
                      <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-3 h-9 rounded-r-md border border-gray-300 text-[14px]">
                        % a.m.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-r from-[#434BE6]/5 to-white border-[#434BE6]/20 shadow-sm">
                  <h3 className="text-[14px] font-medium flex items-center gap-2 text-[#434BE6]">
                    <PlusCircle className="h-4 w-4 text-[#434BE6]" />
                    Adicionar Nova Parcela
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="novoMes" className="flex items-center gap-2 text-[14px]">
                        <Calendar className="h-4 w-4 text-[#434BE6]" />
                        Mês da Parcela
                      </Label>
                      <Input
                        id="novoMes"
                        type="number"
                        value={novoMes}
                        onChange={(e) => setNovoMes(Number(e.target.value))}
                        className="text-right bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="novoValor" className="flex items-center gap-2 text-[14px]">
                        <CreditCard className="h-4 w-4 text-[#434BE6]" />
                        Valor da Parcela
                      </Label>
                      <Input
                        id="novoValor"
                        type="text"
                        value={`R$ ${novoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setNovoValor(Number(value) / 100);
                        }}
                        className="text-right bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={adicionarParcelaPersonalizada} 
                      variant="outline"
                      className="gap-1 border-[#434BE6] text-[#434BE6] hover:bg-[#434BE6]/5 h-9 text-[14px]"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {parcelasPersonalizadas.length > 0 && (
                  <div className="border rounded-lg p-4 bg-white animate-in fade-in border-gray-300 shadow-sm">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-[#434BE6] text-[14px]">
                      <FileSpreadsheet className="h-4 w-4 text-[#434BE6]" />
                      Parcelas Adicionadas
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                      {parcelasPersonalizadas
                        .sort((a, b) => a.mes - b.mes)
                        .map((parcela, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center border-b border-gray-200 pb-2 hover:bg-gray-50 rounded px-2"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-[#434BE6]/5 text-xs border-[#434BE6]/20 text-[#434BE6]">
                                Mês {parcela.mes}
                              </Badge>
                              <span className="font-medium text-[14px]">{formatCurrency(parcela.valor)}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 rounded-full text-[#434BE6] hover:bg-[#434BE6]/5 hover:text-[#434BE6]"
                                onClick={() => {
                                  setNovoMes(parcela.mes);
                                  setNovoValor(parcela.valor);
                                  removerParcelaPersonalizada(index);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => removerParcelaPersonalizada(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {/* Card Resultado Prévio para Mobile - antes do botão calcular */}
          <div className="md:hidden mt-4 mb-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gradient-to-r from-[#434BE6]/5 to-white border-b pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-[#434BE6]" />
                  Resultado Prévio
                </CardTitle>
                <CardDescription className="text-xs">
                  Resumo dos valores calculados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Valor do Imóvel:</span>
                    <span className="font-medium text-xs">{formatCurrency(valorImovel)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Entrada:</span>
                    <span className="font-medium text-xs">{formatCurrency(valorEntrada)}</span>
                  </div>

                  {tipoParcelamento === 'automatico' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Valor das Parcelas:</span>
                      <span className="font-medium text-xs">{formatCurrency(valorParcela)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-b py-2 my-2">
                    <span className="font-medium text-xs">Valor Total Financiado:</span>
                    <span className="font-medium text-[#434BE6] text-xs">{formatCurrency(valorFinanciado)}</span>
                  </div>

                  {tipoParcelamento === 'automatico' && adicionarReforcos && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Quantidade de Reforços:</span>
                        <span className="font-medium text-xs">{infoReforcos.quantidade}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Valor de cada Reforço:</span>
                        <span className="font-medium text-xs">{formatCurrency(valorReforco)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Total de Reforços:</span>
                        <span className="font-medium text-xs">{formatCurrency(infoReforcos.valorTotal)}</span>
                      </div>
                    </>
                  )}

                  {tipoParcelamento === 'automatico' && adicionarValorChaves && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Valor nas Chaves:</span>
                      <span className="font-medium text-xs">{formatCurrency(valorChaves)}</span>
                    </div>
                  )}

                  {tipoParcelamento === 'personalizado' && parcelasPersonalizadas.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Total das Parcelas:</span>
                      <span className="font-medium text-xs">
                        {formatCurrency(parcelasPersonalizadas.reduce((sum, p) => sum + p.valor, 0))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-[#434BE6]/5 p-2 rounded-md mt-3">
                    <span className="text-[#434BE6] font-medium text-xs">Correção até chaves:</span>
                    <div className="flex items-center gap-1">
                      <span className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 py-1 rounded text-xs">
                        {correcaoMensalAteChaves}% a.m.
                      </span>
                      <Badge variant="outline" className="bg-[#434BE6]/5 border-[#434BE6]/20 text-[#434BE6] text-[10px]">
                        {tipoIndiceAteChaves === 'incc' ? 'INCC' : 
                         tipoIndiceAteChaves === 'cub' ? 'CUB/SC' : 
                         tipoIndiceAteChaves === 'igpm' ? 'IGP-M' : 'Personalizado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#434BE6]/5 p-2 rounded-md">
                    <span className="text-[#434BE6] font-medium text-xs">Correção após chaves:</span>
                    <div className="flex items-center gap-1">
                      <span className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 py-1 rounded text-xs">
                        {correcaoMensalAposChaves}% a.m.
                      </span>
                      <Badge variant="outline" className="bg-[#434BE6]/5 border-[#434BE6]/20 text-[#434BE6] text-[10px]">
                        {tipoIndiceAposChaves === 'incc' ? 'INCC' : 
                         tipoIndiceAposChaves === 'cub' ? 'CUB/SC' : 
                         tipoIndiceAposChaves === 'igpm' ? 'IGP-M' : 'Personalizado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <CardFooter className="flex justify-center bg-gradient-to-r from-white to-[#434BE6]/5 border-t p-6">
            <Button 
              className="bg-[#434BE6] hover:bg-[#434BE6]/90 text-white px-10 py-5 text-base font-medium shadow-md rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              onClick={() => handleCalcular(true)}
            >
              <Calculator className="mr-2 h-5 w-5" />
              Calcular
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Resultado Prévio (1/3 da tela) - fixo com scroll desktop, oculto mobile */}
      <div className="hidden md:block md:col-span-1">
        <div className="sticky top-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gradient-to-r from-[#434BE6]/5 to-white border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#434BE6]" />
                Resultado Prévio
              </CardTitle>
              <CardDescription>
                Resumo dos valores calculados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[14px]">Valor do Imóvel:</span>
                  <span className="font-medium text-[14px]">{formatCurrency(valorImovel)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[14px]">Entrada:</span>
                  <span className="font-medium text-[14px]">{formatCurrency(valorEntrada)}</span>
                </div>

                {tipoParcelamento === 'automatico' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-[14px]">Valor das Parcelas:</span>
                    <span className="font-medium text-[14px]">{formatCurrency(valorParcela)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-b py-2 my-2">
                  <span className="font-medium text-[14px]">Valor Total Financiado:</span>
                  <span className="font-medium text-[#434BE6] text-[14px]">{formatCurrency(valorFinanciado)}</span>
                </div>

                {tipoParcelamento === 'automatico' && adicionarReforcos && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-[14px]">Quantidade de Reforços:</span>
                      <span className="font-medium text-[14px]">{infoReforcos.quantidade}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-[14px]">Valor de cada Reforço:</span>
                      <span className="font-medium text-[14px]">{formatCurrency(valorReforco)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-[14px]">Total de Reforços:</span>
                      <span className="font-medium text-[14px]">{formatCurrency(infoReforcos.valorTotal)}</span>
                    </div>
                  </>
                )}

                {tipoParcelamento === 'automatico' && adicionarValorChaves && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-[14px]">Valor nas Chaves:</span>
                    <span className="font-medium text-[14px]">{formatCurrency(valorChaves)}</span>
                  </div>
                )}

                {tipoParcelamento === 'personalizado' && parcelasPersonalizadas.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-[14px]">Total das Parcelas:</span>
                    <span className="font-medium text-[14px]">
                      {formatCurrency(parcelasPersonalizadas.reduce((sum, p) => sum + p.valor, 0))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center bg-[#434BE6]/5 p-2 rounded-md mt-4">
                  <span className="text-[#434BE6] font-medium text-[14px]">Correção até chaves:</span>
                  <div className="flex items-center gap-1">
                    <span className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 py-1 rounded text-[14px]">
                      {correcaoMensalAteChaves}% a.m.
                    </span>
                    <Badge variant="outline" className="bg-[#434BE6]/5 border-[#434BE6]/20 text-[#434BE6] text-[12px]">
                      {tipoIndiceAteChaves === 'incc' ? 'INCC' : 
                       tipoIndiceAteChaves === 'cub' ? 'CUB/SC' : 
                       tipoIndiceAteChaves === 'igpm' ? 'IGP-M' : 'Personalizado'}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#434BE6]/5 p-2 rounded-md">
                  <span className="text-[#434BE6] font-medium text-[14px]">Correção após chaves:</span>
                  <div className="flex items-center gap-1">
                    <span className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-2 py-1 rounded text-[14px]">
                      {correcaoMensalAposChaves}% a.m.
                    </span>
                    <Badge variant="outline" className="bg-[#434BE6]/5 border-[#434BE6]/20 text-[#434BE6] text-[12px]">
                      {tipoIndiceAposChaves === 'incc' ? 'INCC' : 
                       tipoIndiceAposChaves === 'cub' ? 'CUB/SC' : 
                       tipoIndiceAposChaves === 'igpm' ? 'IGP-M' : 'Personalizado'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>

          </Card>
        </div>
      </div>
    </div>
  );
}