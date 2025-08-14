import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function Projections() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch projections data
  const { data: projections = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/projections'],
    staleTime: 60000, // 1 minute
  });
  
  // Filter projections based on search term
  const filteredProjections = isLoading 
    ? [] 
    : projections.filter((projection: any) => 
        projection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (projection.client?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projeções de Investimento</h1>
        <Button onClick={() => navigate("/projections/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Projeção
        </Button>
      </div>
      
      <div className="flex w-full items-center space-x-2 mb-6">
        <Input
          placeholder="Buscar por título ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
          <TabsTrigger value="rental">Renda</TabsTrigger>
          <TabsTrigger value="sale">Venda Futura</TabsTrigger>
          <TabsTrigger value="appreciation">Valorização</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Projeções</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as simulações de investimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                // Loading state
                <div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredProjections?.length > 0 ? (
                // Projections table
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estratégias</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">TIR</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjections.map((projection: any) => (
                      <TableRow key={projection.id}>
                        <TableCell className="font-medium">{projection.title}</TableCell>
                        <TableCell>{projection.client?.name || "Sem cliente"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {projection.strategies.map((strategy: string, index: number) => (
                              <span 
                                key={index}
                                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                              >
                                {strategy === 'rentalYield' && 'Renda'}
                                {strategy === 'futureSale' && 'Venda Futura'}
                                {strategy === 'assetAppreciation' && 'Valorização'}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {projection.calculationResults?.roi 
                            ? `${projection.calculationResults.roi.toFixed(2)}%`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {projection.calculationResults?.irr
                            ? `${projection.calculationResults.irr.toFixed(2)}%`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              navigate(`/projections/${projection.id}`);
                              // Fazer scroll para o topo da página após a navegação
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }, 100);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                // Empty state
                <div className="h-[300px] flex flex-col items-center justify-center text-center">
                  <FileText className="h-16 w-16 text-slate-200 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma projeção encontrada</h3>
                  <p className="text-slate-500 mt-1 max-w-md">
                    {searchTerm 
                      ? `Nenhum resultado para "${searchTerm}". Tente outro termo.`
                      : "Crie sua primeira projeção para começar a simular investimentos."}
                  </p>
                  {!searchTerm && (
                    <Button 
                      className="mt-4"
                      onClick={() => navigate("/projections/create")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Projeção
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent" className="mt-6">
          {/* Similar structure to 'all' tab but filtered for recent projections */}
          <Card>
            <CardHeader>
              <CardTitle>Projeções Recentes</CardTitle>
              <CardDescription>
                Projeções criadas ou atualizadas nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <FileText className="h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-medium">Em breve</h3>
                <p className="text-slate-500 mt-1">
                  Esta seção está sendo implementada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Similar structure for the other tabs */}
        <TabsContent value="rental" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Projeções de Renda</CardTitle>
              <CardDescription>
                Projeções com foco em renda passiva e ganhos de aluguel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <FileText className="h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-medium">Em breve</h3>
                <p className="text-slate-500 mt-1">
                  Esta seção está sendo implementada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}