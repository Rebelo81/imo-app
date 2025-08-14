import { useState, useEffect, useCallback, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Repeat, Edit, Key, Info } from "lucide-react";
import { DollarSign, Percent, Check, Plus, Trash2, CreditCard, Clock, Building2 } from "lucide-react";

interface PurchaseDataFormProps {
  form: UseFormReturn<any, any, undefined>;
}

export function PurchaseDataForm({ form }: PurchaseDataFormProps) {
  const [tipoParcelamento, setTipoParcelamento] = useState<'automatico' | 'personalizado'>(
    form.getValues("tipoParcelamento") || 'automatico'
  );
  
  // Estado para o parcelamento personalizado - igual ao da calculadora financeira
  const [parcelasPersonalizadas, setParcelasPersonalizadas] = useState<{mes: number, valor: number}[]>([]);
  const [novoMes, setNovoMes] = useState<number>(1);
  const [novoValor, setNovoValor] = useState<number>(1000);

  // Sincronizar estado local com valor do formulário - usando getValues para evitar loop infinito
  const formTipoParcelamento = form.watch("tipoParcelamento");
  useEffect(() => {
    if (formTipoParcelamento && formTipoParcelamento !== tipoParcelamento) {
      setTipoParcelamento(formTipoParcelamento);
    }
  }, [formTipoParcelamento, tipoParcelamento]);

  // Estados antigos mantidos para compatibilidade
  const [newPaymentMonth, setNewPaymentMonth] = useState<string>("");
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [isAddingPayment, setIsAddingPayment] = useState<boolean>(false);

  // Inicializar array de pagamentos personalizados se não existir
  const customPayments = form.watch("customPayments") || [];

  // Query para buscar dados dos índices financeiros
  const { data: financialIndexes } = useQuery({
    queryKey: ['/api/financial-indexes'],
    queryFn: async () => {
      const response = await fetch('/api/financial-indexes');
      if (!response.ok) {
        throw new Error('Falha ao carregar índices financeiros');
      }
      return response.json();
    }
  });

  // Função para buscar valor do índice selecionado - memoizada para evitar recriação
  const getIndexValue = useCallback((indexType: string): string => {
    if (!financialIndexes || indexType === 'Personalizado') {
      return '0';
    }

    switch (indexType) {
      case 'INCC-M':
        return financialIndexes.incc?.average ? financialIndexes.incc.average.toFixed(2) : '0';
      case 'IGP-M':
        return financialIndexes.igpm?.average ? financialIndexes.igpm.average.toFixed(2) : '0';
      case 'IPCA':
        return financialIndexes.ipca?.average ? financialIndexes.ipca.average.toFixed(2) : '0';
      case 'CUB-SC':
        return financialIndexes.cub_sc?.average ? financialIndexes.cub_sc.average.toFixed(2) : '0';
      default:
        return '0';
    }
  }, [financialIndexes]);

  // Função para lidar com mudança no dropdown do índice - memoizada para evitar recriação
  const handleIndexChange = useCallback((value: string, fieldName: string) => {
    const correctionFieldName = fieldName === 'indiceCorrecao' ? 'monthlyCorrection' : 'correcaoMensalAposChaves';
    const indexValue = getIndexValue(value);
    
    // Atualizar o campo do índice
    form.setValue(fieldName, value);
    // Atualizar o campo de correção com o valor do índice
    form.setValue(correctionFieldName, indexValue);
  }, [getIndexValue, form]);

  // Definir valores padrão dos índices na inicialização - otimizado para evitar loop infinito
  useEffect(() => {
    if (financialIndexes) {
      // INCC-M como padrão para correção até chaves
      const currentIndiceCorrecao = form.getValues('indiceCorrecao');
      const currentMonthlyCorrection = form.getValues('monthlyCorrection');
      
      if (!currentIndiceCorrecao || currentIndiceCorrecao === 'INCC-M') {
        form.setValue('indiceCorrecao', 'INCC-M');
        // Sempre atualizar o valor da correção se estiver vazio ou com valor 0
        if (!currentMonthlyCorrection || currentMonthlyCorrection === '0' || currentMonthlyCorrection === '') {
          const inccValue = getIndexValue('INCC-M');
          form.setValue('monthlyCorrection', inccValue);
        }
      }
      
      // IGP-M como padrão para correção após chaves
      const currentIndiceCorrecaoAposChaves = form.getValues('indiceCorrecaoAposChaves');
      const currentCorrecaoAposChaves = form.getValues('correcaoMensalAposChaves');
      
      if (!currentIndiceCorrecaoAposChaves || currentIndiceCorrecaoAposChaves === 'IGP-M') {
        form.setValue('indiceCorrecaoAposChaves', 'IGP-M');
        // Sempre atualizar o valor da correção se estiver vazio ou com valor 0
        if (!currentCorrecaoAposChaves || currentCorrecaoAposChaves === '0' || currentCorrecaoAposChaves === '') {
          const igpmValue = getIndexValue('IGP-M');
          form.setValue('correcaoMensalAposChaves', igpmValue);
        }
      }
    }
  }, [financialIndexes, getIndexValue, form]);

  // Forçar atualização inicial dos valores quando os dados financeiros estão disponíveis - otimizado
  useEffect(() => {
    if (financialIndexes) {
      // Forçar atualização manual dos valores se os campos estão com INCC-M/IGP-M mas sem valores
      const timeout = setTimeout(() => {
        const indiceCorrecao = form.getValues('indiceCorrecao');
        const monthlyCorrection = form.getValues('monthlyCorrection');
        
        if (indiceCorrecao === 'INCC-M' && (!monthlyCorrection || monthlyCorrection === '0' || monthlyCorrection === '')) {
          handleIndexChange('INCC-M', 'indiceCorrecao');
        }
        
        const indiceCorrecaoApos = form.getValues('indiceCorrecaoAposChaves');
        const correcaoApos = form.getValues('correcaoMensalAposChaves');
        
        if (indiceCorrecaoApos === 'IGP-M' && (!correcaoApos || correcaoApos === '0' || correcaoApos === '')) {
          handleIndexChange('IGP-M', 'indiceCorrecaoAposChaves');
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [financialIndexes, handleIndexChange, form]);

  // Função para adicionar um novo pagamento personalizado
  const addCustomPayment = () => {
    const month = parseInt(newPaymentMonth);
    const amount = newPaymentAmount;

    if (isNaN(month) || month <= 0 || amount === "") {
      return;
    }

    const updatedPayments = [...customPayments, { month, amount, type: "custom" }];

    // Ordenar pagamentos por mês
    updatedPayments.sort((a, b) => a.month - b.month);

    form.setValue("customPayments", updatedPayments, { shouldValidate: true });
    setNewPaymentMonth("");
    setNewPaymentAmount("");
    setIsAddingPayment(false);
  };

  // Função para mudança de tipo de parcelamento - igual ao da calculadora financeira
  const handleTipoParcelamentoChange = (value: 'automatico' | 'personalizado') => {
    setTipoParcelamento(value);
    form.setValue("tipoParcelamento", value);
    
    // Limpar campos do outro tipo de parcelamento quando mudar
    if (value === 'automatico') {
      // Limpar campos do parcelamento personalizado
      setParcelasPersonalizadas([]);
      form.setValue("parcelasPersonalizadas", []);
      form.setValue("customPayments", []);
      // Resetar campos de entrada do formulário personalizado
      setNovoMes(1);
      setNovoValor(1000);
    } else {
      // Limpar campos do parcelamento automático
      form.setValue("paymentPeriod", "");
      form.setValue("monthlyCorrection", "");
      form.setValue("hasBoost", false);
      form.setValue("boostValue", "");
      form.setValue("periodicidadeReforco", "");
      form.setValue("hasKeys", false);
      form.setValue("keysValue", "");
      // Resetar valores relacionados à correção após chaves se aplicável
      form.setValue("correcaoMensalAposChaves", "");
      form.setValue("indiceCorrecaoAposChaves", "");
    }
  };

  // Função para adicionar uma parcela personalizada - igual ao da calculadora financeira
  const adicionarParcelaPersonalizada = (e: React.MouseEvent) => {
    // Prevenir comportamento padrão para evitar o refresh do formulário
    e.preventDefault();
    
    const novaParcela = {
      mes: novoMes,
      valor: novoValor
    };
    
    // Adicionar ao array de parcelas
    const novasParcelas = [...parcelasPersonalizadas, novaParcela];
    setParcelasPersonalizadas(novasParcelas);
    
    // Atualizar campos no formulário
    form.setValue("parcelasPersonalizadas", novasParcelas);
    
    // Atualizar o campo customPayments para o resumo lateral
    const customPayments = form.getValues("customPayments") || [];
    customPayments.push({
      month: novoMes,
      amount: novoValor.toString()
    });
    form.setValue("customPayments", customPayments);
    
    // Incrementar o mês para a próxima parcela
    setNovoMes(novoMes + 1);
  };
  
  // Função unificada para remover uma parcela personalizada
  const removerParcelaPersonalizada = (index: number) => {
    try {
      const novasParcelas = [...parcelasPersonalizadas];
      const parcela = novasParcelas[index];
      
      if (!parcela) {
        console.warn('Parcela não encontrada no índice:', index);
        return;
      }
      
      novasParcelas.splice(index, 1);
      
      // Atualizar o estado local
      setParcelasPersonalizadas(novasParcelas);
      
      // Atualizar o formulário para as parcelas personalizadas
      form.setValue("parcelasPersonalizadas", novasParcelas, { shouldValidate: true });
      
      // Também atualizar o campo customPayments para manter sincronização
      const customPayments = form.getValues("customPayments") || [];
      const indexToRemove = customPayments.findIndex((p: any) => p.month === parcela.mes);
      
      if (indexToRemove !== -1) {
        const updatedCustomPayments = [...customPayments];
        updatedCustomPayments.splice(indexToRemove, 1);
        form.setValue("customPayments", updatedCustomPayments, { shouldValidate: true });
      }
      
      console.log('Parcela removida com sucesso:', parcela);
    } catch (error) {
      console.error('Erro ao remover parcela:', error);
    }
  };
  
  // Função para editar uma parcela existente - igual ao da calculadora financeira
  const editarParcelaPersonalizada = (index: number) => {
    const parcela = parcelasPersonalizadas[index];
    
    // Colocar os valores da parcela nos campos de edição
    setNovoMes(parcela.mes);
    setNovoValor(parcela.valor);
    
    // Remover a parcela para poder adicioná-la novamente
    removerParcelaPersonalizada(index);
  };

  // Calcular o valor total das parcelas personalizadas - igual ao da calculadora financeira
  const valorTotalParcelasPersonalizadas = parcelasPersonalizadas.reduce((acc, parcela) => acc + parcela.valor, 0);

  // Calcular valor total financiado (valor do imóvel - entrada)
  const valorImovel = parseCurrency(form.watch("listPrice") || "0");
  const valorEntrada = parseCurrency(form.watch("downPayment") || "0");
  const valorTotalFinanciado = valorImovel - valorEntrada;

  // Calcular diferença entre valor financiado e total das parcelas
  const diferencaValores = valorTotalFinanciado - valorTotalParcelasPersonalizadas;
  const valoresIguais = Math.abs(diferencaValores) < 0.01; // Tolerância para centavos

  // Formatação de valores monetários
  const handleCurrencyBlur = (e: React.FocusEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const value = e.target.value;

    if (!value) {
      onChange("");
      return;
    }

    // Converter o valor para número e depois formatar
    const numericValue = parseCurrency(value);
    e.target.value = formatCurrency(numericValue).replace("R$ ", "");
    onChange(numericValue.toString());
  };

  // Atualizar valores relacionados às parcelas automaticamente quando houver mudanças
  useEffect(() => {
    // Se a periodicidade dos reforços mudar, atualizar o cálculo
    const updateBoostInfo = () => {
      if (form.watch("hasBoost") && form.watch("periodicidadeReforco") && form.watch("paymentPeriod")) {
        // Forçar a atualização dos campos relacionados para atualizar a visualização
        form.trigger("hasBoost");
        form.trigger("periodicidadeReforco");
        form.trigger("boostValue");
      }
    };

    updateBoostInfo();
  }, [
    form.watch("hasBoost"), 
    form.watch("periodicidadeReforco"), 
    form.watch("paymentPeriod"),
    form.watch("boostValue")
  ]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#434BE6]" />
            Valores e Condições Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <FormField
                control={form.control}
                name="listPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <DollarSign className="h-4 w-4 text-[#434BE6]" />
                      Valor do Imóvel (R$)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 500.000,00" 
                        {...field}
                        value={field.value ? formatCurrency(parseFloat(field.value)).replace("R$ ", "") : ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const numericValue = value ? (parseInt(value) / 100).toString() : "";
                          field.onChange(numericValue);
                        }}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-left">
                      Valor total do imóvel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-4">
              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <DollarSign className="h-4 w-4 text-[#434BE6]" />
                      Entrada (R$)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 100.000,00" 
                        {...field}
                        value={field.value ? formatCurrency(parseFloat(field.value)).replace("R$ ", "") : ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const numericValue = value ? (parseInt(value) / 100).toString() : "";
                          field.onChange(numericValue);
                        }}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Valor pago como entrada
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name="deliveryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <Calendar className="h-4 w-4 text-[#434BE6]" />
                      Previsão de Entrega
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Ex: 36" 
                          {...field} 
                          type="number"
                          min="0"
                          className="h-10 w-24"
                        />
                        <span className="text-xs text-muted-foreground">(meses)</span>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tempo estimado para entrega das chaves
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#434BE6]" />
            Forma de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Parcelamento como cards */}
          <div className="mb-4">
            <FormField
              control={form.control}
              name="tipoParcelamento"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="flex items-center gap-2 text-[14px]">
                    <CreditCard className="h-4 w-4 text-[#434BE6]" />
                    Tipo de Parcelamento
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card 
                        className={`cursor-pointer hover:border-[#434BE6] transition-all ${field.value === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-300 shadow-sm'}`}
                        onClick={() => {
                          field.onChange('automatico');
                          handleTipoParcelamentoChange('automatico');
                        }}
                      >
                        <CardContent className="p-3 flex items-start gap-2">
                          <div className={`rounded-full h-4 w-4 mt-0.5 flex items-center justify-center border-2 ${field.value === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/10' : 'border-gray-300'}`}>
                            {field.value === 'automatico' && <div className="rounded-full h-2 w-2 bg-[#434BE6]"></div>}
                          </div>
                          <div>
                            <h4 className="font-medium text-[14px] mb-0.5">Parcelamento Automático</h4>
                            <p className="text-[12px] text-muted-foreground">Sistema calcula parcelas de valor fixo</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card 
                        className="cursor-not-allowed opacity-50 border-gray-200 bg-gray-50 transition-all relative"
                      >
                        <CardContent className="p-3 flex items-start gap-2">
                          <div className="rounded-full h-4 w-4 mt-0.5 flex items-center justify-center border-2 border-gray-300">
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-[14px] mb-0.5 text-gray-500">Parcelamento Personalizado</h4>
                            <p className="text-[12px] text-gray-400">Defina manualmente cada parcela</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                                Em breve
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-center">
                    Como as parcelas serão distribuídas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Exibe os campos apenas se o usuário já escolheu um tipo de parcelamento */}
          {form.watch("tipoParcelamento") && (
            <>
              {/* Prazo de pagamento apenas para parcelamento automático */}
              {form.watch("tipoParcelamento") === "automatico" && (
                <FormField
                  control={form.control}
                  name="paymentPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Clock className="h-4 w-4 text-[#434BE6]" />
                        Prazo (meses)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 36" 
                          {...field} 
                          type="number"
                          min="1"
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Período total de pagamento em meses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Correção mensal até as chaves em uma linha */}
          <div className="flex flex-row gap-4 items-start">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="monthlyCorrection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <Percent className="h-4 w-4 text-[#434BE6]" />
                      Correção Mensal até Chaves (%)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 0.5" 
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Taxa de correção mensal até a entrega das chaves
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-[40%]">
              <FormField
                control={form.control}
                name="indiceCorrecao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <Percent className="h-4 w-4 text-[#434BE6]" />
                      Índice
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-[#434BE6]/60 hover:text-[#434BE6] cursor-help transition-colors ml-1" />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="bottom" 
                            className="max-w-xs bg-slate-900 text-white text-sm p-3 rounded-lg shadow-lg border-0"
                          >
                            <p>💡 Ao selecionar um índice financeiro (INCC-M, IGP-M, IPCA ou CUB-SC), o valor será preenchido automaticamente com a média dos últimos 12 meses. Para inserir um valor personalizado, selecione "Personalizado".</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => handleIndexChange(value, 'indiceCorrecao')} 
                      defaultValue={field.value || "INCC-M"}
                      value={field.value || "INCC-M"}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Personalizado">Personalizado</SelectItem>
                        <SelectItem value="INCC-M">INCC-M</SelectItem>
                        <SelectItem value="IGP-M">IGP-M</SelectItem>
                        <SelectItem value="IPCA">IPCA</SelectItem>
                        <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Índice de correção
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Correção após entrega em outra linha */}
          {form.watch("tipoParcelamento") && (
            // Para parcelamento automático: só mostrar se prazo > entrega
            // Para parcelamento personalizado: sempre mostrar
            (form.watch("tipoParcelamento") === "personalizado") ||
            (form.watch("tipoParcelamento") === "automatico" && parseInt(form.watch("paymentPeriod") || "0") > parseInt(form.watch("deliveryTime") || "0"))
          ) && (
            <div className="flex flex-row gap-4 items-start">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="correcaoMensalAposChaves"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Percent className="h-4 w-4 text-[#434BE6]" />
                        Correção Mensal após Chaves (%)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 0.5" 
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="h-10"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Taxa de correção após entrega
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-[40%]">
                <FormField
                  control={form.control}
                  name="indiceCorrecaoAposChaves"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Percent className="h-4 w-4 text-[#434BE6]" />
                        Índice
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-[#434BE6]/60 hover:text-[#434BE6] cursor-help transition-colors ml-1" />
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              className="max-w-xs bg-slate-900 text-white text-sm p-3 rounded-lg shadow-lg border-0"
                            >
                              <p>💡 Para correção após entrega das chaves, o IGP-M é selecionado por padrão. Você pode alterar para outro índice ou inserir um valor personalizado conforme necessário.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => handleIndexChange(value, 'indiceCorrecaoAposChaves')} 
                        defaultValue={field.value || "IGP-M"}
                        value={field.value || "IGP-M"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Personalizado">Personalizado</SelectItem>
                          <SelectItem value="INCC-M">INCC-M</SelectItem>
                          <SelectItem value="IGP-M">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="CUB-SC">CUB-SC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Índice após entrega
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Cards para reforços e chaves - APENAS no parcelamento automático */}
          {form.watch("tipoParcelamento") === "automatico" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card de Reforços/Balões */}
                <FormField
                  control={form.control}
                  name="hasBoost"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Card 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            field.value ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-200 hover:border-[#434BE6]/50'
                          }`}
                          onClick={() => field.onChange(!field.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-full p-2 ${
                                field.value ? 'bg-[#434BE6]/10' : 'bg-gray-100'
                              }`}>
                                <Check className={`h-4 w-4 ${
                                  field.value ? 'text-[#434BE6]' : 'text-gray-400'
                                }`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h4 className="font-medium text-[14px]">Reforços/Balões</h4>
                                <p className="text-[12px] text-muted-foreground">
                                  Adicionar pagamentos intermediários para reforçar o financiamento
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Card de Chaves na Entrega */}
                <FormField
                  control={form.control}
                  name="hasKeys"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Card 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            field.value ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-200 hover:border-[#434BE6]/50'
                          }`}
                          onClick={() => field.onChange(!field.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-full p-2 ${
                                field.value ? 'bg-[#434BE6]/10' : 'bg-gray-100'
                              }`}>
                                <Check className={`h-4 w-4 ${
                                  field.value ? 'text-[#434BE6]' : 'text-gray-400'
                                }`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h4 className="font-medium text-[14px]">Chaves na Entrega</h4>
                                <p className="text-[12px] text-muted-foreground">
                                  Adicionar um pagamento no momento da entrega das chaves
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Campos condicionais para reforços - aparecem quando card selecionado */}
              {form.watch("hasBoost") && (
                <Card className="border-l-4 border-[#434BE6] bg-[#434BE6]/5">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-[14px] flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#434BE6]" />
                      Periodicidade
                    </h4>
                    <FormField
                      control={form.control}
                      name="periodicidadeReforco"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px]">Frequência dos pagamentos de reforço</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-[14px]">
                                <SelectValue placeholder="Trimestral (a cada 3 meses)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bimestral">Bimestral (a cada 2 meses)</SelectItem>
                              <SelectItem value="trimestral">Trimestral (a cada 3 meses)</SelectItem>
                              <SelectItem value="semestral">Semestral (a cada 6 meses)</SelectItem>
                              <SelectItem value="anual">Anual (a cada 12 meses)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="boostValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <DollarSign className="h-4 w-4 text-[#434BE6]" />
                            Valor do Reforço (R$)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 10.000,00"
                              {...field}
                              value={field.value ? formatCurrency(parseFloat(field.value)).replace("R$ ", "") : ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const numericValue = value ? (parseInt(value) / 100).toString() : "";
                                field.onChange(numericValue);
                              }}
                              className="h-10"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Valor de cada reforço
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Campo condicional para chaves - aparece quando card selecionado */}
              {form.watch("hasKeys") && (
                <Card className="border-l-4 border-[#434BE6] bg-[#434BE6]/5">
                  <CardContent className="p-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="keysValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <DollarSign className="h-4 w-4 text-[#434BE6]" />
                            Valor das Chaves (R$)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 50.000,00"
                              {...field}
                              value={field.value ? formatCurrency(parseFloat(field.value)).replace("R$ ", "") : ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const numericValue = value ? (parseInt(value) / 100).toString() : "";
                                field.onChange(numericValue);
                              }}
                              className="h-10"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Valor a ser pago na entrega das chaves
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {form.watch("tipoParcelamento") === "personalizado" && (
            <div className="space-y-6">
              
              {/* Formulário para adicionar pagamentos - Design melhorado */}
              <Card className="border-2 border-dashed border-[#434BE6]/30 bg-gradient-to-br from-[#434BE6]/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-[#434BE6]">
                    <Plus className="h-5 w-5" />
                    Adicionar Novo Pagamento
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Defina o mês e valor do pagamento personalizado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Layout melhorado com grid responsivo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="novoMes" className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#434BE6]" />
                        Mês do Pagamento
                      </Label>
                      <Input 
                        id="novoMes"
                        type="number" 
                        value={novoMes}
                        onChange={(e) => setNovoMes(Number(e.target.value))}
                        className="h-11 text-sm"
                        placeholder="Ex: 12"
                        min="1"
                        max="120"
                      />
                      <p className="text-xs text-muted-foreground">
                        Mês em que o pagamento será realizado
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="novoValor" className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#434BE6]" />
                        Valor do Pagamento
                      </Label>
                      <div className="relative">
                        <DollarSign className="h-4 w-4 text-[#434BE6] absolute left-3 top-3.5" />
                        <Input 
                          id="novoValor"
                          className="h-11 text-sm pl-10"
                          type="text"
                          value={formatCurrency(novoValor)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setNovoValor(value ? parseInt(value) / 100 : 0);
                          }}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valor em reais do pagamento
                      </p>
                    </div>
                  </div>
                  
                  {/* Botão de adicionar melhorado */}
                  <div className="pt-2 border-t border-[#434BE6]/10">
                    <Button
                      onClick={(e) => adicionarParcelaPersonalizada(e)}
                      className="w-full h-11 bg-[#434BE6] hover:bg-[#434BE6]/90 text-white font-medium gap-2"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Pagamento à Lista
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Lista de pagamentos melhorada */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-[#434BE6]" />
                        Pagamentos Cadastrados
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {parcelasPersonalizadas.length === 0 
                          ? "Nenhum pagamento adicionado ainda" 
                          : `${parcelasPersonalizadas.length} pagamento${parcelasPersonalizadas.length > 1 ? 's' : ''} cadastrado${parcelasPersonalizadas.length > 1 ? 's' : ''}`
                        }
                      </CardDescription>
                    </div>
                    {parcelasPersonalizadas.length > 0 && (
                      <Badge variant="secondary" className="bg-[#434BE6]/10 text-[#434BE6] border-[#434BE6]/20">
                        {parcelasPersonalizadas.length} {parcelasPersonalizadas.length === 1 ? 'pagamento' : 'pagamentos'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                {parcelasPersonalizadas.length > 0 ? (
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                      {parcelasPersonalizadas
                        .sort((a, b) => a.mes - b.mes)
                        .map((parcela, index) => (
                        <div 
                          key={index} 
                          className="group flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-[#434BE6]/30 hover:shadow-sm transition-all duration-200"
                        >
                          {/* Badge do mês melhorado */}
                          <div className="flex-shrink-0">
                            <Badge className="bg-[#434BE6] text-white px-3 py-1 text-[12px] font-normal">
                              Mês {parcela.mes}
                            </Badge>
                          </div>
                          
                          {/* Valor destacado */}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-[15px]">
                              {formatCurrency(parcela.valor)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Pagamento #{index + 1}
                            </div>
                          </div>
                          
                          {/* Ações com melhor design */}
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removerParcelaPersonalizada(index);
                              }}
                              title="Remover pagamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Resumo dos valores melhorado */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-gradient-to-r from-[#434BE6]/5 to-transparent rounded-lg p-4 space-y-3">
                        {/* Estatísticas de pagamentos */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total de Pagamentos:</span>
                            <span className="font-medium text-gray-900">{parcelasPersonalizadas.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Valor Total:</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(valorTotalParcelasPersonalizadas)}</span>
                          </div>
                        </div>
                        
                        {/* Valor financiado */}
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-[#434BE6]/10">
                          <span className="text-gray-600 font-medium">Valor Total Financiado:</span>
                          <span className="text-[#434BE6] font-bold text-base">{formatCurrency(valorTotalFinanciado)}</span>
                        </div>
                        
                        {/* Status da validação melhorado */}
                        {valorTotalParcelasPersonalizadas > 0 && (
                          <div className="pt-3">
                            {valoresIguais ? (
                              <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-sm">Valores Conferem!</div>
                                  <div className="text-xs">Os pagamentos somam exatamente o valor financiado.</div>
                                </div>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                                diferencaValores > 0 
                                  ? 'text-orange-700 bg-orange-50 border-orange-200' 
                                  : 'text-red-700 bg-red-50 border-red-200'
                              }`}>
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    diferencaValores > 0 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}>
                                    <Info className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {diferencaValores > 0 
                                      ? `Faltam ${formatCurrency(diferencaValores)}`
                                      : `Excesso de ${formatCurrency(Math.abs(diferencaValores))}`
                                    }
                                  </div>
                                  <div className="text-xs">
                                    {diferencaValores > 0 
                                      ? 'Adicione mais pagamentos para completar o valor financiado.'
                                      : 'Ajuste os valores para que a soma seja igual ao valor financiado.'
                                    }
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pagamento cadastrado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use o formulário acima para adicionar seus pagamentos personalizados
                      </p>
                      <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                        💡 <strong>Dica:</strong> Adicione pagamentos em diferentes meses para criar um cronograma personalizado
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}