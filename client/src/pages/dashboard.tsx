import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  LineChart, 
  Users, 
  Building2, 
  Calculator, 
  Plus,
  ArrowRight,
  FileText,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboards/StatCard";
import ProjectionTable from "@/components/dashboards/ProjectionTable";
import { SubscriptionAlert } from "@/components/SubscriptionAlert";
import { formatPercentage, formatCurrency } from "@/lib/utils";

// Types for dashboard statistics
interface DashboardStats {
  totalProjections: number;
  totalClients: number;
  totalProperties: number;
  averageRoi: number;
  averageIrr: number;
  averageYield: number;
  activeProjections: number;
  completedProjections: number;
  strategyCount: {
    futureSale: number;
    assetAppreciation: number;
    rentalYield: number;
  };
  recentProjections: any[];
}

// Types for financial indexes
interface FinancialIndexes {
  ipca?: {
    average: number;
    lastMonth: { month: string; value: number };
    dataCount: number;
  };
  igpm?: {
    average: number;
    lastMonth: { month: string; value: number };
    dataCount: number;
  };
  cdi?: {
    average: number;
    lastMonth: { month: string; value: number };
    dataCount: number;
  };
  incc?: {
    average: number;
    lastMonth: { month: string; value: number };
    dataCount: number;
    source: string;
  };
  cub_sc?: {
    average: number;
    lastMonth: { month: string; value: number };
    dataCount: number;
    source: string;
  };
  selic_meta?: {
    value: number;
    updatedAt: string;
  };
  selic_acumulada?: {
    value: number;
    referenceDate: string;
    updatedAt: string;
  };
}



export default function Dashboard() {
  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });



  // Fetch financial indexes data
  const { data: financialIndexes, isLoading: financialIndexesLoading } = useQuery<FinancialIndexes>({
    queryKey: ['/api/financial-indexes'],
  });

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1200px] mx-auto pt-4 md:pt-6 px-4 md:px-0">
      {/* Subscription Alert */}
      <SubscriptionAlert />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard </h1>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral do seu portfólio de investimentos</p>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/planilha">
            <Button variant="outline" size="sm" className="hidden md:flex gap-1">
              <Calculator className="h-4 w-4" />
              <span>Calculadora Financeira</span>
            </Button>
          </Link>
          <Link href="/projections/create">
            <Button size="sm" className="gap-1">
              <Plus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Nova Projeção</span>
            </Button>
          </Link>
        </div>
      </div>
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard 
          title="Total de Projeções" 
          value={stats?.totalProjections || 0} 
          icon={LineChart} 
          iconColor="primary"
          isLoading={isLoading}
        />
        
        <StatCard 
          title="Clientes Cadastrados" 
          value={stats?.totalClients || 0} 
          icon={Users} 
          iconColor="secondary"
          isLoading={isLoading}
        />
        
        <StatCard 
          title="Imóveis Cadastrados" 
          value={stats?.totalProperties || 0} 
          icon={Building2} 
          iconColor="accent"
          isLoading={isLoading}
        />
      </div>
      
      {/* Financial Indexes Section */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Índices Financeiros</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Últimas variações mensais dos principais índices</p>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs md:text-sm">
              Ver todos
              <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* Taxa Selic Card */}
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <CardTitle className="text-sm md:text-base">Taxa Selic</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 md:space-y-2">
              {financialIndexesLoading ? (
                <div className="w-12 h-5 md:w-16 md:h-6 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-bold text-slate-900">
                    {financialIndexes?.selic_meta?.value ? 
                      `${financialIndexes.selic_meta.value.toFixed(2).replace('.', ',')}%` : 'N/D'}
                  </p>
                  <p className="text-xs text-muted-foreground">Taxa anual (COPOM)</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IPCA Card */}
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <CardTitle className="text-sm md:text-base">IPCA</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 md:space-y-2">
              {financialIndexesLoading ? (
                <div className="w-12 h-5 md:w-16 md:h-6 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-bold text-slate-900">
                    {financialIndexes?.ipca?.lastMonth?.value !== undefined ? 
                      `${financialIndexes.ipca.lastMonth.value.toFixed(2).replace('.', ',')}%` : 'N/D'}
                  </p>
                  <p className="text-xs text-muted-foreground">Variação mensal</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* INCC Card */}
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <CardTitle className="text-sm md:text-base">INCC-M</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 md:space-y-2">
              {financialIndexesLoading ? (
                <div className="w-12 h-5 md:w-16 md:h-6 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-bold text-slate-900">
                    {financialIndexes?.incc?.lastMonth?.value !== undefined ? 
                      `${financialIndexes.incc.lastMonth.value.toFixed(2).replace('.', ',')}%` : 'N/D'}
                  </p>
                  <p className="text-xs text-muted-foreground">Variação mensal</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IGP-M Card */}
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <CardTitle className="text-sm md:text-base">IGP-M</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 md:space-y-2">
              {financialIndexesLoading ? (
                <div className="w-12 h-5 md:w-16 md:h-6 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-bold text-slate-900">
                    {financialIndexes?.igpm?.lastMonth?.value !== undefined ? 
                      `${financialIndexes.igpm.lastMonth.value.toFixed(2).replace('.', ',')}%` : 'N/D'}
                  </p>
                  <p className="text-xs text-muted-foreground">Variação mensal</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CUB-SC Card */}
          <Card>
            <CardHeader className="pb-1 md:pb-2">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <CardTitle className="text-sm md:text-base">CUB-SC</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 md:space-y-2">
              {financialIndexesLoading ? (
                <div className="w-12 h-5 md:w-16 md:h-6 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div>
                  <p className="text-lg md:text-xl font-bold text-slate-900">
                    {financialIndexes?.cub_sc?.lastMonth?.value !== undefined ? 
                      `${financialIndexes.cub_sc.lastMonth.value.toFixed(2).replace('.', ',')}%` : 'N/D'}
                  </p>
                  <p className="text-xs text-muted-foreground">Variação mensal</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Recent Projections Table - Hidden on mobile */}
      <Card className="hidden md:block">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Projeções Recentes</CardTitle>
              <CardDescription>As últimas 5 projeções financeiras criadas</CardDescription>
            </div>
            <Link href="/projections">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-sm">
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ProjectionTable 
            projections={stats?.recentProjections?.slice(0, 5) || []} 
            isLoading={isLoading} 
          />
          {(!stats?.recentProjections || stats.recentProjections.length === 0) && !isLoading && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma projeção encontrada</h3>
              <p className="text-sm text-slate-500 mb-4">Comece criando sua primeira projeção financeira</p>
              <Link href="/projections/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Projeção
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
