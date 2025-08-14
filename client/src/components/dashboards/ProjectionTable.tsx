import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Edit, Share2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectionTableProps {
  projections: Array<{
    id: number;
    title: string;
    client: { id: number; name: string } | null;
    strategies: string[];
    calculationResults: any;
    createdAt: string;
  }>;
  isLoading?: boolean;
}

export default function ProjectionTable({ 
  projections, 
  isLoading = false 
}: ProjectionTableProps) {
  const [, navigate] = useLocation();
  // Helper function to get strategy display name and color
  const getStrategyInfo = (strategy: string) => {
    switch (strategy) {
      case "FUTURE_SALE":
        return { 
          name: "Venda Futura", 
          color: "bg-blue-50 text-blue-700 border-blue-200"
        };
      case "ASSET_APPRECIATION":
        return { 
          name: "Valorização", 
          color: "bg-purple-50 text-purple-700 border-purple-200"
        };
      case "RENTAL_YIELD":
        return { 
          name: "Rentabilidade", 
          color: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
      default:
        return { 
          name: strategy, 
          color: "bg-slate-50 text-slate-700 border-slate-200"
        };
    }
  };

  // Show loading skeleton if data is loading
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] text-center">Projeto</TableHead>
              <TableHead className="text-center">Estratégias</TableHead>
              <TableHead className="text-center">Data</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="text-center">
                  <div className="space-y-1 flex flex-col items-center">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-5 w-24 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-2 justify-center">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%] text-center">Projeto</TableHead>
            <TableHead className="text-center">Estratégias</TableHead>
            <TableHead className="text-center">Data</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <p>Nenhuma projeção encontrada</p>
                  <Link href="/projections/create">
                    <Button size="sm" variant="outline" className="mt-2">Criar projeção</Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            projections.map((projection) => {
              return (
                <TableRow key={projection.id} className="hover:bg-slate-50">
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="font-medium">{projection.title}</div>
                      {projection.client && (
                        <div className="text-xs text-slate-500">
                          Cliente: {projection.client.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {projection.strategies && Array.isArray(projection.strategies) && projection.strategies.length > 0 
                        ? projection.strategies.map((strategyKey, index) => {
                            const strategy = getStrategyInfo(strategyKey);
                            return (
                              <Badge 
                                key={index}
                                variant="outline" 
                                className={cn("font-normal text-xs py-0.5", strategy.color)}
                              >
                                {strategy.name}
                              </Badge>
                            );
                          })
                        : (
                          <Badge variant="outline" className="font-normal text-xs py-0.5 bg-slate-50 text-slate-500 border-slate-200">
                            -
                          </Badge>
                        )
                      }
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-500 text-sm">
                    {formatDate(projection.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/projections/create?id=${projection.id}`)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          navigate(`/projections/${projection.id}`);
                          // Fazer scroll para o topo da página após a navegação
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }, 100);
                        }}
                      >
                        Ver detalhes
                        <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
