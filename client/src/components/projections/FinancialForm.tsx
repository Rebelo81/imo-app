import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

// Form schema
const financialFormSchema = z.object({
  deliveryMonths: z.coerce.number().int().min(0, "Meses deve ser um número positivo"),
  listPrice: z.string().min(1, "Valor de tabela é obrigatório"),
  discount: z.string().default("0"),
  downPayment: z.string().min(1, "Entrada é obrigatória"),
  paymentMonths: z.coerce.number().int().min(1, "Prazo deve ser pelo menos 1 mês"),
  monthlyCorrection: z.string().min(0, "Correção mensal é obrigatória"),
  postDeliveryCorrection: z.string().default("0"),
  includeBonusPayments: z.boolean().default(false),
  bonusFrequency: z.coerce.number().int().min(0, "Frequência deve ser um número positivo"),
});

type FinancialFormValues = z.infer<typeof financialFormSchema>;

interface FinancialFormProps {
  onSubmit: (values: FinancialFormValues) => void;
  onChange?: (values: FinancialFormValues) => void;
  defaultValues?: Partial<FinancialFormValues>;
}

export default function FinancialForm({
  onSubmit,
  onChange,
  defaultValues,
}: FinancialFormProps) {
  // Initialize form with default values
  const form = useForm<FinancialFormValues>({
    resolver: zodResolver(financialFormSchema),
    defaultValues: {
      deliveryMonths: defaultValues?.deliveryMonths || 24,
      listPrice: defaultValues?.listPrice || "",
      discount: defaultValues?.discount || "0",
      downPayment: defaultValues?.downPayment || "20",
      paymentMonths: defaultValues?.paymentMonths || 36,
      monthlyCorrection: defaultValues?.monthlyCorrection || "1",
      postDeliveryCorrection: defaultValues?.postDeliveryCorrection || "0.5",
      includeBonusPayments: defaultValues?.includeBonusPayments || false,
      bonusFrequency: defaultValues?.bonusFrequency || 6,
    },
  });

  // Watch for form changes to update preview
  const formValues = form.watch();

  // Notify parent component of form changes
  useEffect(() => {
    if (onChange) {
      onChange(formValues);
    }
  }, [formValues, onChange]);

  // Format currency on blur
  const handleCurrencyBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const value = e.target.value;
    if (!value) return;

    // Remove currency formatting if present
    const numericValue = value.replace(/[^\d,.-]/g, "").replace(",", ".");

    // If it's a valid number, format it
    if (!isNaN(parseFloat(numericValue))) {
      onChange(numericValue);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Financeiros</CardTitle>
        <CardDescription>
          Informe os valores e condições de pagamento do imóvel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="deliveryMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Entrega da Obra (meses)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Quantidade de meses até a entrega das chaves
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="listPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Tabela (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 500000"
                        onBlur={(e) =>
                          handleCurrencyBlur(e, field.onChange)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrada (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 20" />
                    </FormControl>
                    <FormDescription>
                      Percentual do valor total a ser pago como entrada
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo de Pagamento (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyCorrection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correção Mensal até as Chaves (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 1" />
                    </FormControl>
                    <FormDescription>
                      Percentual de correção mensal das parcelas até a entrega
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postDeliveryCorrection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correção Mensal Pós-Entrega (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 0.5" />
                    </FormControl>
                    <FormDescription>
                      Percentual de correção após a entrega das chaves
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includeBonusPayments"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Incluir Reforços e Chaves
                    </FormLabel>
                    <FormDescription>
                      Ative para incluir pagamentos de reforço periódicos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("includeBonusPayments") && (
              <FormField
                control={form.control}
                name="bonusFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência dos Reforços (meses)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="3">Trimestral (3 meses)</SelectItem>
                        <SelectItem value="6">Semestral (6 meses)</SelectItem>
                        <SelectItem value="12">Anual (12 meses)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Define a periodicidade dos pagamentos de reforço
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
