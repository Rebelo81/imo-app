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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

// Form schema
const assetAppreciationFormSchema = z.object({
  appreciationYears: z.coerce.number().int().min(1, "Período deve ser de pelo menos 1 ano"),
  annualAppreciation: z.string().min(0, "Valorização anual é obrigatória"),
  maintenanceCosts: z.string().min(0, "Custo de manutenção não pode ser negativo"),
});

type AssetAppreciationFormValues = z.infer<typeof assetAppreciationFormSchema>;

interface AssetAppreciationFormProps {
  onSubmit: (values: AssetAppreciationFormValues) => void;
  onChange?: (values: AssetAppreciationFormValues) => void;
  defaultValues?: Partial<AssetAppreciationFormValues>;
  listPrice?: string;
}

export default function AssetAppreciationForm({
  onSubmit,
  onChange,
  defaultValues,
  listPrice = "0",
}: AssetAppreciationFormProps) {
  // Initialize form with default values
  const form = useForm<AssetAppreciationFormValues>({
    resolver: zodResolver(assetAppreciationFormSchema),
    defaultValues: {
      appreciationYears: defaultValues?.appreciationYears || 10,
      annualAppreciation: defaultValues?.annualAppreciation || "8",
      maintenanceCosts: defaultValues?.maintenanceCosts || "500",
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

  // Calculate future values for display
  const calculateFutureValue = () => {
    const initialValue = parseFloat(listPrice || "0");
    const years = form.getValues("appreciationYears");
    const annualRate = parseFloat(form.getValues("annualAppreciation")) / 100;
    
    if (isNaN(initialValue) || isNaN(years) || isNaN(annualRate)) {
      return initialValue;
    }
    
    return initialValue * Math.pow(1 + annualRate, years);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção de Patrimônio/Valorização</CardTitle>
        <CardDescription>
          Configure os parâmetros para simulação de valorização patrimonial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="appreciationYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de Valorização (anos)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="5">5 anos</SelectItem>
                      <SelectItem value="10">10 anos</SelectItem>
                      <SelectItem value="15">15 anos</SelectItem>
                      <SelectItem value="20">20 anos</SelectItem>
                      <SelectItem value="25">25 anos</SelectItem>
                      <SelectItem value="30">30 anos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Período para projeção da valorização do imóvel
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="annualAppreciation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valorização Anual (%)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: 8" />
                    </FormControl>
                    <FormDescription>
                      Percentual anual de valorização esperado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceCosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custos de Manutenção Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 500"
                        onBlur={(e) => handleCurrencyBlur(e, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription>
                      Custos mensais de manutenção do imóvel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Simulação de Valorização</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Valor atual:</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatCurrency(parseFloat(listPrice || "0"))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor futuro estimado:</p>
                  <p className="text-sm font-medium text-success">
                    {formatCurrency(calculateFutureValue())}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Período:</p>
                  <p className="text-sm font-medium text-slate-700">
                    {form.getValues("appreciationYears")} anos
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total de manutenção:</p>
                  <p className="text-sm font-medium text-danger">
                    {formatCurrency(
                      parseFloat(form.getValues("maintenanceCosts") || "0") * 
                      12 * 
                      form.getValues("appreciationYears")
                    )}
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
