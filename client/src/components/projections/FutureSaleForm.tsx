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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const futureSaleFormSchema = z.object({
  futureValueMethod: z.enum(["percentage", "fixed"]),
  futureValuePercentage: z.string().optional(),
  futureValueFixed: z.string().optional(),
  futureValueMonth: z.coerce.number().int().min(1, "Mês deve ser um número positivo"),
  saleCommission: z.string().min(0, "Comissão não pode ser negativa"),
  saleTaxes: z.string().min(0, "Taxas não podem ser negativas"),
  incomeTax: z.string().min(0, "Imposto de renda não pode ser negativo"),
  additionalCosts: z.string().min(0, "Custos adicionais não podem ser negativos").optional(),
}).refine(
  (data) => {
    if (data.futureValueMethod === "percentage") {
      return !!data.futureValuePercentage;
    } else if (data.futureValueMethod === "fixed") {
      return !!data.futureValueFixed;
    }
    return false;
  },
  {
    message: "Valor futuro é obrigatório",
    path: ["futureValuePercentage"],
  }
);

type FutureSaleFormValues = z.infer<typeof futureSaleFormSchema>;

interface FutureSaleFormProps {
  onSubmit: (values: FutureSaleFormValues) => void;
  onChange?: (values: FutureSaleFormValues) => void;
  defaultValues?: Partial<FutureSaleFormValues>;
  paymentMonths?: number;
}

export default function FutureSaleForm({
  onSubmit,
  onChange,
  defaultValues,
  paymentMonths = 36,
}: FutureSaleFormProps) {
  // Initialize form with default values
  const form = useForm<FutureSaleFormValues>({
    resolver: zodResolver(futureSaleFormSchema),
    defaultValues: {
      futureValueMethod: defaultValues?.futureValueMethod || "percentage",
      futureValuePercentage: defaultValues?.futureValuePercentage || "30",
      futureValueFixed: defaultValues?.futureValueFixed || "",
      futureValueMonth: defaultValues?.futureValueMonth || paymentMonths,
      saleCommission: defaultValues?.saleCommission || "5",
      saleTaxes: defaultValues?.saleTaxes || "2",
      incomeTax: defaultValues?.incomeTax || "15",
      additionalCosts: defaultValues?.additionalCosts || "2",
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

  // Update futureValueMonth when paymentMonths changes
  useEffect(() => {
    if (paymentMonths && !defaultValues?.futureValueMonth) {
      form.setValue("futureValueMonth", paymentMonths);
    }
  }, [paymentMonths, form, defaultValues]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção de Venda Futura</CardTitle>
        <CardDescription>
          Configure os parâmetros para simulação de venda futura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="futureValueMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Método de Valorização</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="percentage" />
                        <Label htmlFor="percentage">Valorização Percentual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed">Valor Fixo</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("futureValueMethod") === "percentage" ? (
              <FormField
                control={form.control}
                name="futureValuePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valorização Projetada (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 30" />
                    </FormControl>
                    <FormDescription>
                      Percentual de valorização em relação ao valor de compra
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="futureValueFixed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Futuro de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 650000" />
                    </FormControl>
                    <FormDescription>
                      Valor projetado para venda futura
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="futureValueMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês da Venda</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: Math.max(60, paymentMonths) }, (_, i) => i + 1).map(
                        (month) => (
                          <SelectItem key={month} value={month.toString()}>
                            Mês {month}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Quando ocorrerá a venda projetada
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="saleCommission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão sobre Venda (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saleTaxes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxas e Impostos (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incomeTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imposto de Renda (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 15" />
                    </FormControl>
                    <FormDescription>
                      Percentual de imposto sobre o lucro bruto
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="additionalCosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custos Adicionais (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 2" />
                    </FormControl>
                    <FormDescription>
                      Percentual de custos adicionais sobre o valor futuro
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
