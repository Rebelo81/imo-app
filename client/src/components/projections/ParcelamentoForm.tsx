import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  CreditCard, 
  Wallet, 
  Calendar, 
  Percent, 
  DollarSign,
  Plus,
  Minus,
  Clock,
  Repeat,
  Key,
  Trash2,
  Edit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface ParcelamentoFormProps {
  form: UseFormReturn<any>;
}

export function ParcelamentoForm({ form }: ParcelamentoFormProps) {
  const [tipoParcelamento, setTipoParcelamento] = useState<'automatico' | 'personalizado'>(
    form.getValues("tipoParcelamento") || 'automatico'
  );
  
  const [mostrarCorrecaoAposChaves, setMostrarCorrecaoAposChaves] = useState(false);
  const [valorParcela, setValorParcela] = useState(0);
  
  // Estado para o parcelamento personalizado
  const [parcelasPersonalizadas, setParcelasPersonalizadas] = useState<{mes: number, valor: number, tipo: string}[]>([]);
  const [novoMes, setNovoMes] = useState<number>(1);
  const [novoValor, setNovoValor] = useState<number>(1000);
  const [novoTipo, setNovoTipo] = useState<string>("parcela");
  
  // Verificar se o prazo de pagamento é maior que o prazo de entrega
  useEffect(() => {
    const prazoEntrega = Number(form.getValues("deliveryPeriod") || 0);
    const prazoPagamento = Number(form.getValues("paymentPeriod") || 0);
    
    setMostrarCorrecaoAposChaves(prazoPagamento > prazoEntrega);
  }, [form.watch("paymentPeriod"), form.watch("deliveryPeriod")]);
  
  // Calcular o valor das parcelas quando mudar algum valor relevante
  useEffect(() => {
    // Obter os valores dos campos relevantes do formulário
    const valorListaPreco = Number(form.getValues("listPrice") || 0);
    const valorDesconto = Number(form.getValues("discountValue") || 0); // Valor calculado do desconto
    const valorEntrada = Number(form.getValues("downPayment") || 0);
    
    // Calcular o saldo financiado a partir dos dados prévios
    const saldoFinanciado = valorListaPreco - valorDesconto - valorEntrada;
    
    // Armazenar o saldo financiado no formulário para uso posterior
    form.setValue("financeValue", saldoFinanciado);
    
    // Obter demais valores para cálculo das parcelas
    const prazoPagamento = Number(form.getValues("paymentPeriod") || 36);
    const temReforcos = form.getValues("hasBoost") || false;
    const temChaves = form.getValues("hasKeys") || false;
    const valorReforco = Number(form.getValues("boostValue") || 10000);
    const valorChaves = Number(form.getValues("keysValue") || 50000);
    
    // Calcular quantidade de reforços com base na periodicidade
    let qtdReforcos = 0;
    if (temReforcos) {
      const periodicidade = form.getValues("periodicidadeReforco") || "trimestral";
      const mesesPorReforco = periodicidade === "bimestral" ? 2 : 
                             periodicidade === "trimestral" ? 3 : 
                             periodicidade === "semestral" ? 6 : 12;
      
      qtdReforcos = Math.floor(prazoPagamento / mesesPorReforco);
    }
    
    // Calcular valor total de reforços e chaves
    const totalReforcos = qtdReforcos * valorReforco;
    const totalChaves = temChaves ? valorChaves : 0;
    
    // Saldo a ser dividido em parcelas mensais
    const saldoParaMensalidades = saldoFinanciado - totalReforcos - totalChaves;
    
    // Calcular valor da parcela mensal
    const valorParcelaMensal = prazoPagamento > 0 ? saldoParaMensalidades / prazoPagamento : 0;
    
    // Atualizar valor da parcela
    setValorParcela(valorParcelaMensal);
    
    // Salvar esses valores para uso posterior
    form.setValue("monthlyPaymentValue", valorParcelaMensal);
    form.setValue("totalBoostValue", totalReforcos);
    form.setValue("boostCount", qtdReforcos);
  }, [
    form.watch("listPrice"),
    form.watch("discountValue"),
    form.watch("downPayment"),
    form.watch("paymentPeriod"),
    form.watch("hasBoost"),
    form.watch("hasKeys"),
    form.watch("boostValue"),
    form.watch("keysValue"),
    form.watch("periodicidadeReforco")
  ]);
  
  const handleTipoParcelamentoChange = (value: 'automatico' | 'personalizado') => {
    setTipoParcelamento(value);
    form.setValue("tipoParcelamento", value);
    
    // Limpar campos do outro tipo de parcelamento quando mudar
    if (value === 'automatico') {
      // Limpar campos do parcelamento personalizado
      setParcelasPersonalizadas([]);
      form.setValue("parcelasPersonalizadas", []);
      form.setValue("customPayments", []);
    } else {
      // Limpar campos do parcelamento automático
      form.setValue("paymentPeriod", "");
      form.setValue("monthlyCorrection", "");
      form.setValue("hasBoost", false);
      form.setValue("boostValue", "");
      form.setValue("hasKeys", false);
      form.setValue("keysValue", "");
      form.setValue("monthlyPaymentValue", 0);
      form.setValue("totalBoostValue", 0);
      form.setValue("boostCount", 0);
    }
  };
  
  // Função para adicionar uma parcela personalizada
  const adicionarParcelaPersonalizada = (e: React.MouseEvent) => {
    // Prevenir comportamento padrão para evitar o refresh do formulário
    e.preventDefault();
    
    const novaParcela = {
      mes: novoMes,
      valor: novoValor,
      tipo: novoTipo
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
      amount: novoValor.toString(),
      type: novoTipo
    });
    form.setValue("customPayments", customPayments);
    
    // Incrementar o mês para a próxima parcela
    setNovoMes(novoMes + 1);
  };
  
  // Função para remover uma parcela personalizada
  const removerParcelaPersonalizada = (index: number) => {
    const novasParcelas = [...parcelasPersonalizadas];
    const parcela = novasParcelas[index];
    novasParcelas.splice(index, 1);
    
    // Atualizar o estado
    setParcelasPersonalizadas(novasParcelas);
    
    // Atualizar o formulário para as parcelas personalizadas
    form.setValue("parcelasPersonalizadas", novasParcelas);
    
    // Também atualizar o campo customPayments
    const customPayments = form.getValues("customPayments") || [];
    // Encontrar e remover a parcela correspondente em customPayments
    const indexToRemove = customPayments.findIndex(p => p.month === parcela.mes);
    if (indexToRemove !== -1) {
      customPayments.splice(indexToRemove, 1);
      form.setValue("customPayments", customPayments);
    }
  };
  
  // Função para editar uma parcela existente
  const editarParcelaPersonalizada = (index: number) => {
    const parcela = parcelasPersonalizadas[index];
    
    // Colocar os valores da parcela nos campos de edição
    setNovoMes(parcela.mes);
    setNovoValor(parcela.valor);
    setNovoTipo(parcela.tipo);
    
    // Remover a parcela para poder adicioná-la novamente
    removerParcelaPersonalizada(index);
  };
  
  // Calcular o valor total das parcelas personalizadas
  const valorTotalParcelasPersonalizadas = parcelasPersonalizadas.reduce((acc, parcela) => acc + parcela.valor, 0);
  
  // Valores para uso no componente
  const quantidadeReforcos = form.watch("hasBoost") ? form.watch("boostCount") || 0 : 0;
  const valorReforco = Number(form.watch("boostValue") || 10000);
  const valorChaves = Number(form.watch("keysValue") || 50000);
  const saldoFinanciado = Number(form.watch("financeValue") || 250000);
  
  // Formatar valores para exibição
  const valorParcelaFormatado = formatCurrency(valorParcela);
  const valorReforcoFormatado = formatCurrency(valorReforco);
  const valorChavesFormatado = formatCurrency(valorChaves);
  const valorTotalReforcos = formatCurrency(quantidadeReforcos * valorReforco);
  const saldoFinanciadoFormatado = formatCurrency(saldoFinanciado);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Repeat className="h-5 w-5 text-[#434BE6]" />
            Forma de Parcelamento
          </CardTitle>

        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label className="mb-1 block flex items-center gap-2 text-[14px] justify-center">
              <Repeat className="h-4 w-4 text-[#434BE6]" />
              Tipo de Parcelamento
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer hover:border-[#434BE6] transition-all ${tipoParcelamento === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-300 shadow-sm'}`}
                onClick={() => handleTipoParcelamentoChange('automatico')}
              >
                <CardContent className="p-3 flex items-start gap-2">
                  <div className={`rounded-full h-4 w-4 mt-0.5 flex items-center justify-center border-2 ${tipoParcelamento === 'automatico' ? 'border-[#434BE6] bg-[#434BE6]/10' : 'border-gray-300'}`}>
                    {tipoParcelamento === 'automatico' && <div className="rounded-full h-2 w-2 bg-[#434BE6]"></div>}
                  </div>
                  <div>
                    <h4 className="font-medium text-[14px] mb-0.5">Parcelamento Automático</h4>
                    <p className="text-[12px] text-muted-foreground">Sistema calcula parcelas de valor fixo</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer hover:border-[#434BE6] transition-all ${tipoParcelamento === 'personalizado' ? 'border-[#434BE6] bg-[#434BE6]/5' : 'border-gray-300 shadow-sm'}`}
                onClick={() => handleTipoParcelamentoChange('personalizado')}
              >
                <CardContent className="p-3 flex items-start gap-2">
                  <div className={`rounded-full h-4 w-4 mt-0.5 flex items-center justify-center border-2 ${tipoParcelamento === 'personalizado' ? 'border-[#434BE6] bg-[#434BE6]/10' : 'border-gray-300'}`}>
                    {tipoParcelamento === 'personalizado' && <div className="rounded-full h-2 w-2 bg-[#434BE6]"></div>}
                  </div>
                  <div>
                    <h4 className="font-medium text-[14px] mb-0.5">Parcelamento Personalizado</h4>
                    <p className="text-[12px] text-muted-foreground">Defina manualmente cada parcela</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campos específicos para cada tipo de parcelamento */}
      {tipoParcelamento === 'automatico' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#434BE6]" />
              Parcelamento Automático
            </CardTitle>

          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prazo centralizado */}
            <div className="flex flex-col items-center justify-center mb-3">
              <div className="w-2/3 space-y-1">
                <FormField
                  control={form.control}
                  name="paymentPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 justify-center text-[14px] mb-1">
                        <Calendar className="h-4 w-4 text-[#434BE6]" />
                        Prazo de Pagamento (meses)
                      </FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Meses"
                            {...field}
                            className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                            onChange={(e) => {
                              field.onChange(e);
                              const prazoEntrega = Number(form.getValues("deliveryPeriod") || 0);
                              const prazoPagamento = Number(e.target.value);
                              setMostrarCorrecaoAposChaves(prazoPagamento > prazoEntrega);
                            }}
                          />
                        </FormControl>
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-3 h-9 rounded-r-md border border-l-0 border-gray-300 text-[14px]">
                          meses
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Correções na linha abaixo */}
            <div className="mb-4 border-t border-gray-100 pt-3">
              <h3 className="text-[14px] font-medium text-center mb-2 text-[#434BE6]/80">Índices de Correção</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyCorrection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Percent className="h-4 w-4 text-[#434BE6]" />
                        Correção até chaves
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="%"
                            {...field}
                            className="text-[14px] h-9"
                          />
                        </FormControl>
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-4 h-9 rounded-md border border-gray-300 text-[14px] min-w-[80px] whitespace-nowrap">
                          % a.m.
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="indiceCorrecao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Repeat className="h-4 w-4 text-[#434BE6]" />
                        Índice de Correção
                      </FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === "incc") {
                            form.setValue("monthlyCorrection", "0.78");
                          } else if (value === "igpm") {
                            form.setValue("monthlyCorrection", "0.45");
                          } else if (value === "cub") {
                            form.setValue("monthlyCorrection", "0.65");
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-[14px]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="incc">INCC</SelectItem>
                          <SelectItem value="igpm">IGPM</SelectItem>
                          <SelectItem value="cub">CUB</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Correção após chaves - só aparece se prazo pagamento > prazo entrega */}
              {mostrarCorrecaoAposChaves && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="postKeysCorrection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-[14px]">
                          <Key className="h-4 w-4 text-[#434BE6]" />
                          Correção após chaves
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="%"
                              {...field}
                              className="text-[14px] h-9"
                            />
                          </FormControl>
                          <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-4 h-9 rounded-md border border-gray-300 text-[14px] min-w-[80px] whitespace-nowrap">
                            % a.m.
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="postKeysIndex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-[14px]">
                          <Repeat className="h-4 w-4 text-[#434BE6]" />
                          Índice após chaves
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value === "igpm") {
                              form.setValue("postKeysCorrection", "0.45");
                            } else if (value === "cub") {
                              form.setValue("postKeysCorrection", "0.65");
                            } else if (value === "incc") {
                              form.setValue("postKeysCorrection", "0.78");
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-[14px]">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="igpm">IGPM</SelectItem>
                            <SelectItem value="incc">INCC</SelectItem>
                            <SelectItem value="cub">CUB</SelectItem>
                            <SelectItem value="personalizado">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
            
            {/* Opções adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
              <FormField
                control={form.control}
                name="hasBoost"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 border bg-white">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#434BE6] data-[state=checked]:text-white border-gray-400"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Reforços/Balões
                      </FormLabel>
                      <FormDescription className="text-[12px]">
                        Adicionar pagamentos intermediários
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasKeys"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 border bg-white">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#434BE6] data-[state=checked]:text-white border-gray-400"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Chaves na Entrega
                      </FormLabel>
                      <FormDescription className="text-[12px]">
                        Pagamento na entrega das chaves
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {form.watch("hasBoost") && (
              <div className="grid grid-cols-1 gap-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="periodicidadeReforco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-[14px]">
                          <Calendar className="h-4 w-4 text-[#434BE6]" />
                          Periodicidade
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-[14px]">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bimestral">Bimestral (2 meses)</SelectItem>
                            <SelectItem value="trimestral">Trimestral (3 meses)</SelectItem>
                            <SelectItem value="semestral">Semestral (6 meses)</SelectItem>
                            <SelectItem value="anual">Anual (12 meses)</SelectItem>
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
                          Valor do Reforço/Balão
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="R$ 0,00"
                              {...field}
                              className="h-9 text-[14px] pl-8"
                              onChange={(e) => {
                                // Remover formatação para salvar apenas o número
                                const value = e.target.value.replace(/\D/g, '');
                                const numericValue = value ? parseInt(value) / 100 : 0;
                                field.onChange(numericValue.toString());
                              }}
                              value={field.value ? formatCurrency(Number(field.value)) : ''}
                            />
                          </FormControl>
                          <div className="absolute left-2.5 top-2.5">
                            <DollarSign className="h-4 w-4 text-[#434BE6]" />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md border text-[14px]">
                  <p className="flex items-center justify-between mb-1">
                    <span className="text-gray-600">Quantidade de reforços/balões:</span>
                    <span className="font-medium">{quantidadeReforcos} reforços/balões</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Valor total dos reforços/balões:</span>
                    <span className="font-medium">{valorTotalReforcos}</span>
                  </p>
                </div>
              </div>
            )}
            
            {form.watch("hasKeys") && (
              <div className="grid grid-cols-1 gap-4 pt-3 border-t border-gray-100">
                <FormField
                  control={form.control}
                  name="keysValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <DollarSign className="h-4 w-4 text-[#434BE6]" />
                        Valor das Chaves
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="R$ 0,00"
                            {...field}
                            className="h-9 text-[14px] pl-8"
                            onChange={(e) => {
                              // Remover formatação para salvar apenas o número
                              const value = e.target.value.replace(/\D/g, '');
                              const numericValue = value ? parseInt(value) / 100 : 0;
                              field.onChange(numericValue.toString());
                            }}
                            value={field.value ? formatCurrency(Number(field.value)) : ''}
                          />
                        </FormControl>
                        <div className="absolute left-2.5 top-2.5">
                          <DollarSign className="h-4 w-4 text-[#434BE6]" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Dados Prévios e Resumo do Parcelamento foram movidos para o componente pai */}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#434BE6]" />
              Parcelamento Personalizado
            </CardTitle>

          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prazo centralizado - mesmo do parcelamento automático */}
            <div className="flex flex-col items-center justify-center mb-3">
              <div className="w-2/3 space-y-1">
                <FormField
                  control={form.control}
                  name="customPaymentPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 justify-center text-[14px] mb-1">
                        <Calendar className="h-4 w-4 text-[#434BE6]" />
                        Prazo de Pagamento (meses)
                      </FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Meses"
                            {...field}
                            className="text-center bg-gray-50 border-gray-300 shadow-sm focus-visible:ring-[#434BE6] h-9 text-[14px]"
                          />
                        </FormControl>
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-3 h-9 rounded-r-md border border-l-0 border-gray-300 text-[14px]">
                          meses
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Formulário para adicionar parcelas personalizadas */}
            <div className="border rounded-md mb-4">
              <div className="bg-gray-50 p-3 border-b">
                <h4 className="text-[14px] font-medium">Adicionar Nova Parcela</h4>
              </div>
              <div className="p-3 space-y-3">
                {/* Linha com campo de mês e valor e tipo */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="novoMes" className="text-[12px]">Mês</Label>
                    <Input 
                      id="novoMes"
                      type="number" 
                      value={novoMes}
                      onChange={(e) => setNovoMes(Number(e.target.value))}
                      className="text-[12px] h-9"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="novoTipo" className="text-[12px]">Tipo</Label>
                    <Select 
                      value={novoTipo}
                      onValueChange={(value) => setNovoTipo(value)}
                    >
                      <SelectTrigger id="novoTipo" className="h-9 text-[12px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parcela">Parcela</SelectItem>
                        <SelectItem value="reforco">Reforço/Balão</SelectItem>
                        <SelectItem value="chaves">Chaves</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="novoValor" className="text-[12px]">Valor</Label>
                    <div className="relative">
                      <DollarSign className="h-4 w-4 text-[#434BE6] absolute left-2.5 top-2.5" />
                      <Input 
                        id="novoValor"
                        className="text-[12px] h-9 pl-8"
                        type="text"
                        value={formatCurrency(novoValor)}
                        onChange={(e) => {
                          // Remover caracteres não numéricos
                          const value = e.target.value.replace(/\D/g, '');
                          setNovoValor(value ? parseInt(value) / 100 : 0);
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Botão de adicionar */}
                <div className="flex justify-end">
                  <Button
                    onClick={(e) => adicionarParcelaPersonalizada(e)}
                    size="sm"
                    variant="outline"
                    className="h-8 text-[12px] gap-1 border-[#434BE6] text-[#434BE6] hover:bg-[#434BE6]/5"
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Parcela
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Lista de parcelas personalizadas */}
            <div className="border rounded-md">
              <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                <h4 className="text-[14px] font-medium">Lista de Parcelas</h4>
                <Badge className="bg-[#434BE6]/80">
                  {parcelasPersonalizadas.length} parcelas
                </Badge>
              </div>
              
              {parcelasPersonalizadas.length > 0 ? (
                <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
                  {parcelasPersonalizadas
                    .sort((a, b) => a.mes - b.mes)
                    .map((parcela, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-md border">
                      <div className="w-14 shrink-0">
                        <Badge variant="outline" className="bg-[#434BE6]/5 text-xs border-[#434BE6]/20 text-[#434BE6]">
                          Mês {parcela.mes}
                        </Badge>
                      </div>
                      <div className="grow flex items-center gap-2">
                        <Badge variant="secondary" className="text-[12px] capitalize whitespace-nowrap">
                          {parcela.tipo}
                        </Badge>
                        <span className="font-medium text-[14px]">{formatCurrency(parcela.valor)}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 shrink-0 text-[#434BE6] hover:bg-[#434BE6]/5"
                          onClick={() => editarParcelaPersonalizada(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50"
                          onClick={() => removerParcelaPersonalizada(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-[14px]">
                  Nenhuma parcela adicionada. Use o formulário acima para adicionar parcelas.
                </div>
              )}
              
              <div className="p-3 border-t bg-gray-50">
                <div className="text-[14px] flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Total de Parcelas: {parcelasPersonalizadas.length}</span>
                  <span className="text-gray-700 font-medium">Valor Total: {formatCurrency(valorTotalParcelasPersonalizadas)}</span>
                </div>
              </div>
            </div>
            
            {/* Índices de correção - mesmo do parcelamento automático */}
            <div className="mb-4 border-t border-gray-100 pt-3">
              <h3 className="text-[14px] font-medium text-center mb-2 text-[#434BE6]/80">Índices de Correção</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customMonthlyCorrection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Percent className="h-4 w-4 text-[#434BE6]" />
                        Correção até chaves
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="%"
                            {...field}
                            className="text-[14px] h-9"
                          />
                        </FormControl>
                        <div className="flex items-center justify-center bg-[#434BE6]/10 text-[#434BE6] font-medium px-4 h-9 rounded-md border border-gray-300 text-[14px] min-w-[80px] whitespace-nowrap">
                          % a.m.
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customIndiceCorrecao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-[14px]">
                        <Repeat className="h-4 w-4 text-[#434BE6]" />
                        Índice de Correção
                      </FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-[14px]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="incc">INCC</SelectItem>
                          <SelectItem value="igpm">IGPM</SelectItem>
                          <SelectItem value="cub">CUB</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}