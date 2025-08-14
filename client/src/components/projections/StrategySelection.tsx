import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type ProjectionStrategy, PROJECTION_STRATEGY } from "@shared/schema";

interface StrategySelectionProps {
  selectedStrategies: ProjectionStrategy[];
  onChange: (strategies: ProjectionStrategy[]) => void;
}

export default function StrategySelection({
  selectedStrategies,
  onChange,
}: StrategySelectionProps) {
  const handleStrategyChange = (strategy: ProjectionStrategy, checked: boolean) => {
    if (checked) {
      onChange([...selectedStrategies, strategy]);
    } else {
      onChange(selectedStrategies.filter((s) => s !== strategy));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estratégias de Investimento</CardTitle>
        <CardDescription>
          Selecione uma ou mais estratégias para esta projeção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="futureSale"
              checked={selectedStrategies.includes(PROJECTION_STRATEGY.FUTURE_SALE)}
              onCheckedChange={(checked) =>
                handleStrategyChange(
                  PROJECTION_STRATEGY.FUTURE_SALE,
                  checked as boolean
                )
              }
            />
            <div>
              <Label
                htmlFor="futureSale"
                className="font-medium text-base cursor-pointer"
              >
                Projeção de Venda Futura
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Simulação de investimento com correções, juros e despesas
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="assetAppreciation"
              checked={selectedStrategies.includes(
                PROJECTION_STRATEGY.ASSET_APPRECIATION
              )}
              onCheckedChange={(checked) =>
                handleStrategyChange(
                  PROJECTION_STRATEGY.ASSET_APPRECIATION,
                  checked as boolean
                )
              }
            />
            <div>
              <Label
                htmlFor="assetAppreciation"
                className="font-medium text-base cursor-pointer"
              >
                Projeção de Patrimônio/Valorização
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Simulação da valorização do imóvel em períodos específicos
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="rentalYield"
              checked={selectedStrategies.includes(
                PROJECTION_STRATEGY.RENTAL_YIELD
              )}
              onCheckedChange={(checked) =>
                handleStrategyChange(
                  PROJECTION_STRATEGY.RENTAL_YIELD,
                  checked as boolean
                )
              }
            />
            <div>
              <Label
                htmlFor="rentalYield"
                className="font-medium text-base cursor-pointer"
              >
                Projeção de Rentabilidade com Locação
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Cálculo da rentabilidade com base em locações
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
