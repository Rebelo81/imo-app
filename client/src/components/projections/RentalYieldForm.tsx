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
import { formatCurrency } from "@/lib/utils";

// Form schema
const rentalYieldFormSchema = z.object({
  rentalType: z.enum(["annual", "seasonal"]),
  monthlyRental: z.string().min(1, "Valor do aluguel é obrigatório"),
  furnishingCosts: z.string().default("0"),
  condoFees: z.string().default("0"),
  propertyTax: z.string().default("0"),
});

type RentalYieldFormValues = z.infer<typeof rentalYieldFormSchema>;

interface RentalYieldFormProps {
  onSubmit: (values: RentalYieldFormValues) => void;
  onChange?: (values: RentalYieldFormValues) => void;
  defaultValues?: Partial<RentalYieldFormValues>;
  listPrice?: string;
}

export default function RentalYieldForm({
  onSubmit,
  onChange,
  defaultValues,
  listPrice = "0",
}: RentalYieldFormProps) {
  // Initialize form with default values
  const form = useForm<RentalYieldFormValues>({
    resolver: zodResolver(rentalYieldFormSchema),
    defaultValues: {
      rentalType: defaultValues?.rentalType || "annual",
      monthlyRental: defaultValues?.monthlyRental || "",
      furnishingCosts: defaultValues?.furnishingCosts || "0",
      condoFees: defaultValues?.condoFees || "0",
      propertyTax: defaultValues?.propertyTax || "0",
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

  // Calculate rental yield
  const calculateRentalYield = () => {
    const propertyValue = parseFloat(listPrice || "0");
    const monthlyRental = parseFloat(form.getValues("monthlyRental") || "0");
    const condoFees = parseFloat(form.getValues("condoFees") || "0");
    const propertyTax = parseFloat(form.getValues("propertyTax") || "0");
    const furnishingCosts = parseFloat(form.getValues("furnishingCosts") || "0");
    
    if (propertyValue <= 0 || isNaN(monthlyRental)) {
      return 0;
    }
    
    // Annual rental income
    const annualRental = monthlyRental * 12;
    
    // Annual expenses
    const annualExpenses = (condoFees + propertyTax) * 12;
    
    // Net annual income
    const netAnnualIncome = annualRental - annualExpenses;
    
    // Total investment (property + furnishing)
    const totalInvestment = propertyValue + furnishingCosts;
    
    // Calculate yield
    const yield_percentage = (netAnnualIncome / totalInvestment) * 100;
    
    return yield_percentage;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção de Rentabilidade com Locação</CardTitle>
        <CardDescription>
          Configure os parâmetros para simulação de rentabilidade por aluguel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rentalType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Locação</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="annual" id="annual" />
                        <Label htmlFor="annual">Locação Anual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="seasonal" id="seasonal" />
                        <Label htmlFor="seasonal">Locação por Temporada</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {form.getValues("rentalType") === "annual" 
                      ? "Contrato de longa duração, tipicamente 30 meses" 
                      : "Aluguel de curta duração para turistas e viajantes"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyRental"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Aluguel Mensal (R$)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: 2500"
                      onBlur={(e) => handleCurrencyBlur(e, field.onChange)}
                    />
                  </FormControl>
                  <FormDescription>
                    {form.getValues("rentalType") === "annual" 
                      ? "Valor mensal do aluguel para contrato anual" 
                      : "Valor médio mensal considerando ocupação"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="furnishingCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custos de Mobília (R$)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: 30000"
                      onBlur={(e) => handleCurrencyBlur(e, field.onChange)}
                    />
                  </FormControl>
                  <FormDescription>
                    Investimento inicial em mobília e decoração
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condoFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Condomínio Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 800"
                        onBlur={(e) => handleCurrencyBlur(e, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IPTU Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 200"
                        onBlur={(e) => handleCurrencyBlur(e, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor mensal do IPTU (anual dividido por 12)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Rentabilidade Estimada</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Valor do imóvel:</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatCurrency(parseFloat(listPrice || "0"))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Renda anual bruta:</p>
                  <p className="text-sm font-medium text-success">
                    {formatCurrency(
                      parseFloat(form.getValues("monthlyRental") || "0") * 12
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Despesas anuais:</p>
                  <p className="text-sm font-medium text-danger">
                    {formatCurrency(
                      (parseFloat(form.getValues("condoFees") || "0") + 
                       parseFloat(form.getValues("propertyTax") || "0")) * 12
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Rentabilidade anual:</p>
                  <p className="text-sm font-medium text-success">
                    {calculateRentalYield().toFixed(2)}% a.a.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
