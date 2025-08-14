import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Filter,
  LineChart,
  TrendingUp,
  Building2,
  Eye,
  Edit,
  Trash2,
  CalendarDays,
  SortDesc,
  SortAsc,
  User,
  ArrowUpDown,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Tipo para as projeções
interface Projection {
  id: number;
  userSequentialId: number;
  title: string;
  clientId: number;
  client: { id: number; name: string } | null;
  strategies: string[];
  propertyName?: string;
  propertyType?: string;
  propertyUnit?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  listPrice?: string;
  discount?: string;
  downPayment?: string;
  propertyImageUrl?: string | null;
  imagem_imovel_url?: string | null;
  site_imovel_url?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
  calculationResults: {
    roi?: number;
    irr?: number;
    futureValue?: number;
    netProfit?: number;
    paybackMonths?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Tipo para os clientes
interface Client {
  id: number;
  name: string;
}

// Função para obter o nome da estratégia
function getStrategyName(strategy: string): string {
  switch (strategy) {
    case "FUTURE_SALE":
      return "Venda Futura";
    case "ASSET_APPRECIATION":
      return "Valorização";
    case "RENTAL_YIELD":
      return "Rentabilidade";
    default:
      return strategy;
  }
}

// Função para formatar a data
function formatDisplayDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

// Componente para cada card de projeção
function ProjectionCard({ projection, onDelete, isDeleting }: { 
  projection: Projection, 
  onDelete: (id: number) => void,
  isDeleting?: boolean 
}) {
  const [, navigate] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editWarningOpen, setEditWarningOpen] = useState(false);
  
  // Query para verificar se existe link público para esta projeção
  const { data: publicLinks } = useQuery({
    queryKey: ['/api/projections', projection.id, 'public-links'],
    queryFn: async () => {
      const response = await fetch(`/api/projections/${projection.id}/share`, {
        credentials: 'include',
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!projection.id,
  });
  
  const hasPublicLink = publicLinks && publicLinks.length > 0;
  
  // Determinar a cor do badge da estratégia
  const getBadgeColor = (strategy: string) => {
    switch (strategy) {
      case "FUTURE_SALE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ASSET_APPRECIATION":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "RENTAL_YIELD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <>
      <Card className="overflow-hidden border hover:shadow-sm transition-shadow h-[200px] md:h-[240px]">
        <div className="flex h-full">
          {/* Imagem do imóvel */}
          <div className="w-1/3 flex-shrink-0">
            <div className="h-full bg-gray-100 relative flex items-center justify-center overflow-hidden">
              {projection.propertyImageUrl ? (
                <img 
                  src={projection.propertyImageUrl} 
                  alt={projection.title || ""}
                  className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
                />
              ) : (
                <Building2 className="h-8 w-8 md:h-12 md:w-12 text-gray-300" />
              )}
              
              {/* Badges para todas as estratégias */}
              <div className="absolute top-1 left-1 md:top-2 md:left-2 flex flex-col gap-0.5 md:gap-1">
                {projection.strategies && projection.strategies.length > 0 ? (
                  projection.strategies.map((strategy, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className={`font-normal text-xs py-0.5 px-1 md:py-1 md:px-2 ${getBadgeColor(strategy)}`}
                    >
                      <span className="hidden md:inline">{getStrategyName(strategy)}</span>
                      <span className="md:hidden text-xs">{getStrategyName(strategy).slice(0, 3)}</span>
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="font-normal text-xs py-0.5 px-1 md:py-1 md:px-2 bg-gray-50 text-gray-700 border-gray-200">
                    <span className="hidden md:inline">Sem estratégia</span>
                    <span className="md:hidden">N/A</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Detalhes da projeção */}
          <div className="flex-1 p-2 md:p-3 flex flex-col justify-between">
            <div className="flex-1 overflow-hidden">
              {/* ID da projeção */}
              <div className="text-xs text-[#6B7280] mb-1">
                Projeção #{projection.userSequentialId || projection.id}
              </div>
              
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-xs md:text-sm leading-tight truncate pr-2">{projection.title || "Sem título"}</h3>
                </div>
                
                {/* Cliente em destaque */}
                <div className="mt-1 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{projection.client ? projection.client.name : "Cliente não associado"}</span>
                  </div>
                </div>
                
                {/* Informações do Imóvel */}
                <div className="mt-1 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1 min-w-0">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{projection.propertyName || "—"}</span>
                    {projection.city && projection.state && (
                      <>
                        <span className="mx-1 flex-shrink-0 hidden md:inline">•</span>
                        <span className="truncate hidden md:inline">{projection.city}, {projection.state}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 md:mt-3 bg-gray-50 p-1.5 md:p-2 rounded">
                <p className="text-xs text-[#6B7280]">Valor do Imóvel</p>
                <p className="font-medium text-xs md:text-sm">
                  {projection.listPrice 
                    ? formatCurrency(Number(projection.listPrice)) 
                    : "—"}
                </p>
              </div>
            </div>
            
            {/* Footer com botões - SEMPRE VISÍVEL */}
            <div className="mt-2 md:mt-3 pt-1.5 md:pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#6B7280] flex items-center min-w-0 flex-1 mr-2">
                  <CalendarDays className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{formatDisplayDate(projection.createdAt || projection.data_criacao)}</span>
                </div>
                <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                  <Button 
                    size="sm" 
                    className="h-6 md:h-7 px-1.5 md:px-2 text-xs bg-[#434BE6] hover:bg-[#3039C9]"
                    onClick={() => {
                      navigate(`/projections/${projection.id}`);
                      // Fazer scroll para o topo da página após a navegação
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 100);
                    }}
                  >
                    <span className="hidden sm:inline">Visualizar</span>
                    <Eye className="h-3 w-3 sm:hidden" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 w-6 md:h-7 md:w-7 p-0"
                    onClick={() => {
                      // Verificar se há links públicos existentes
                      if (hasPublicLink) {
                        setEditWarningOpen(true);
                      } else {
                        navigate(`/projections/create?id=${projection.id}`);
                      }
                    }}
                    title="Editar projeção"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 w-6 md:h-7 md:w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    title="Excluir projeção"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a projeção "{projection.title || 'Sem título'}"?
              <br /><br />
              Esta ação não pode ser desfeita e também removerá todos os cálculos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                onDelete(projection.id);
                setIsDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialog de aviso ao editar projeção com links públicos */}
      <Dialog open={editWarningOpen} onOpenChange={setEditWarningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Atenção: Link público existente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Esta projeção possui um link público que já pode ter sido compartilhado com clientes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> Ao editar esta projeção, o link de compartilhamento atual ficará inválido. 
                Caso você tenha compartilhado com algum cliente, o relatório não ficará mais visível para ele.
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Solução:</strong> Após editar, você poderá gerar um novo link para compartilhar novamente.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  setEditWarningOpen(false);
                  navigate(`/projections/create?id=${projection.id}`);
                }}
                className="w-full"
              >
                Editar mesmo assim
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setEditWarningOpen(false);
                  navigate(`/projections/create`);
                }}
                className="w-full"
              >
                Criar nova projeção
              </Button>
              
              <Button 
                variant="ghost"
                onClick={() => setEditWarningOpen(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente de paginação
function Pagination({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}: { 
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        
        {Array.from({ length: totalPages }).map((_, i) => (
          <Button
            key={i}
            variant={currentPage === i + 1 ? "default" : "outline"}
            size="sm"
            className={`w-9 ${currentPage === i + 1 ? 'bg-primary' : ''}`}
            onClick={() => onPageChange(i + 1)}
          >
            {i + 1}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

export default function ProjectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Verificar se há um clientId na URL e selecionar automaticamente
  useEffect(() => {
    // Obter o clientId diretamente da URL atual do navegador
    const searchParams = new URLSearchParams(window.location.search);
    const clientId = searchParams.get('clientId');
    
    if (clientId) {
      const clientIdNumber = parseInt(clientId);
      if (!isNaN(clientIdNumber)) {
        setSelectedClients([clientIdNumber]);
      }
    }
  }, [setSelectedClients]);
  
  // Buscar as projeções
  const { data: projections = [], isLoading } = useQuery<Projection[]>({
    queryKey: ['/api/projections'],
  });
  
  // Buscar os clientes
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });
  
  // Mutation para excluir uma projeção
  const deleteProjectionMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        // Excluir a projeção (o servidor já cuida de excluir os cálculos associados)
        const response = await apiRequest('DELETE', `/api/projections/${id}`);
        return response;
      } catch (error: any) {
        console.error('Erro na mutação de exclusão:', error);
        // Re-throw the error with more details
        throw new Error(error?.message || error?.error || 'Erro desconhecido ao excluir projeção');
      }
    },
    onSuccess: () => {
      // Invalidar as consultas para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Mostrar notificação de sucesso
      toast({
        title: "Projeção excluída",
        description: "A projeção foi excluída com sucesso.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir projeção:', error);
      
      let errorMessage = "Não foi possível excluir a projeção. Tente novamente.";
      
      // Try to extract a meaningful error message
      if (typeof error?.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error?.error === 'string') {
        errorMessage = error.error;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      // Mostrar notificação de erro
      toast({
        title: "Erro ao excluir",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Ordenar projeções por data (usamos createdAt ou data_criacao dependendo do que estiver disponível)
  const sortedProjections = [...projections].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.data_criacao || "").getTime();
    const dateB = new Date(b.createdAt || b.data_criacao || "").getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });
  
  // Filtrar as projeções pelo termo de busca e clientes selecionados
  const filteredProjections = sortedProjections.filter(proj => {
    // Filtrar por termo de busca
    const titleMatch = proj.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const clientMatch = proj.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const propertyMatch = [
      proj.propertyName, 
      proj.address, 
      proj.neighborhood, 
      proj.city, 
      proj.state
    ].filter(Boolean).some(val => 
      val?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const searchMatch = titleMatch || clientMatch || propertyMatch;
    
    // Filtrar por clientes selecionados
    const clientFilter = selectedClients.length === 0 || 
                        (proj.client && selectedClients.includes(proj.client.id)) ||
                        (proj.clientId && selectedClients.includes(proj.clientId));
    
    return searchMatch && clientFilter;
  });

  // Filtrar projeções com base na aba ativa
  const getFilteredByTab = (projections: Projection[]) => {
    switch (activeTab) {
      case "future-sale":
        return projections.filter(proj => proj.strategies.includes("FUTURE_SALE"));
      case "appreciation":
        return projections.filter(proj => proj.strategies.includes("ASSET_APPRECIATION"));
      case "rental":
        return projections.filter(proj => proj.strategies.includes("RENTAL_YIELD"));
      default:
        return projections;
    }
  };
  
  const tabFilteredProjections = getFilteredByTab(filteredProjections);
  
  // Get current page items
  const getPaginatedItems = (items: Projection[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };
  
  // Componente para o estado de carregamento
  const ProjectionsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
      {[1, 2, 3, 4].map((_, i) => (
        <Card key={i} className="overflow-hidden h-[200px] md:h-[240px]">
          <div className="grid grid-cols-3 h-full">
            <div className="col-span-1 bg-gray-100" />
            <div className="col-span-2 p-2 md:p-4">
              <Skeleton className="h-4 md:h-6 w-3/4 mb-2" />
              <Skeleton className="h-3 md:h-4 w-1/2 mb-1" />
              <Skeleton className="h-3 md:h-4 w-1/3 mb-2 md:mb-3" />
              <div className="mb-2 md:mb-4">
                <Skeleton className="h-8 md:h-10 w-full" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 md:h-4 w-16 md:w-20" />
                <div className="flex gap-0.5 md:gap-2">
                  <Skeleton className="h-6 w-12 md:h-8 md:w-20" />
                  <Skeleton className="h-6 w-6 md:h-8 md:w-8" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Alternar a seleção de um cliente
  const toggleClientSelection = (clientId: number) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
    setCurrentPage(1); // Reset to first page when changing filters
  };

  // Limpar filtros
  const clearFilters = () => {
    setSelectedClients([]);
    setSearchQuery("");
    setCurrentPage(1); // Reset to first page when clearing filters
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="py-3 md:py-6 px-3 md:px-0 max-w-[1400px] mx-auto">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1">Minhas Projeções</h1>
          <p className="text-sm md:text-base text-[#6B7280]">Gerencie todas as suas simulações e projeções imobiliárias</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 sm:flex-none">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <Input 
              placeholder="Buscar projeções..." 
              className="pl-9 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 sm:gap-3 justify-end sm:justify-start">
            {/* Filtro de Clientes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 relative">
                  <Filter className="h-4 w-4" />
                  {selectedClients.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {selectedClients.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <h4 className="mb-2 font-medium text-sm">Filtrar por Cliente</h4>
                {clients.length > 0 ? (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {clients.map(client => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`client-${client.id}`}
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor={`client-${client.id}`} className="text-sm">
                          {client.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum cliente disponível</p>
                )}
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
            {/* Ordenação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setSortOrder("newest")}
                  className={sortOrder === "newest" ? "bg-slate-100" : ""}
                >
                  <SortDesc className="mr-2 h-4 w-4" />
                  <span>Mais recentes primeiro</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder("oldest")}
                  className={sortOrder === "oldest" ? "bg-slate-100" : ""}
                >
                  <SortAsc className="mr-2 h-4 w-4" />
                  <span>Mais antigas primeiro</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link href="/projections/create">
              <Button className="gap-1 text-xs sm:text-sm bg-[#434BE6] hover:bg-[#3039C9] h-9 sm:h-10 px-3 sm:px-4">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Projeção</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Abas para filtragem */}
      <Tabs 
        defaultValue="all" 
        className="mb-4 md:mb-6" 
        onValueChange={handleTabChange}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-4 gap-0">
          <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
          <TabsTrigger value="future-sale" className="text-xs sm:text-sm">Venda</TabsTrigger>
          <TabsTrigger value="appreciation" className="text-xs sm:text-sm">Valorização</TabsTrigger>
          <TabsTrigger value="rental" className="text-xs sm:text-sm">Renda</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {isLoading ? (
            <ProjectionsSkeleton />
          ) : tabFilteredProjections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <LineChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">Nenhuma projeção encontrada</h3>
              <p className="text-[#6B7280] mb-4">Comece criando sua primeira projeção imobiliária</p>
              <Link href="/projections/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Projeção
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {getPaginatedItems(tabFilteredProjections).map((projection) => (
                  <ProjectionCard 
                    key={projection.id} 
                    projection={projection} 
                    onDelete={(id) => deleteProjectionMutation.mutate(id)}
                    isDeleting={deleteProjectionMutation.isPending}
                  />
                ))}
              </div>
              
              <Pagination 
                currentPage={currentPage}
                totalItems={tabFilteredProjections.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="future-sale">
          {isLoading ? (
            <ProjectionsSkeleton />
          ) : tabFilteredProjections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <LineChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">Nenhuma projeção de Venda Futura encontrada</h3>
              <p className="text-[#6B7280] mb-4">Comece criando sua primeira projeção imobiliária</p>
              <Link href="/projections/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Projeção
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {getPaginatedItems(tabFilteredProjections).map((projection) => (
                  <ProjectionCard 
                    key={projection.id} 
                    projection={projection} 
                    onDelete={(id) => deleteProjectionMutation.mutate(id)}
                    isDeleting={deleteProjectionMutation.isPending}
                  />
                ))}
              </div>
              
              <Pagination 
                currentPage={currentPage}
                totalItems={tabFilteredProjections.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="appreciation">
          {isLoading ? (
            <ProjectionsSkeleton />
          ) : tabFilteredProjections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <LineChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">Nenhuma projeção de Valorização encontrada</h3>
              <p className="text-[#6B7280] mb-4">Comece criando sua primeira projeção imobiliária</p>
              <Link href="/projections/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Projeção
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {getPaginatedItems(tabFilteredProjections).map((projection) => (
                  <ProjectionCard 
                    key={projection.id} 
                    projection={projection} 
                    onDelete={(id) => deleteProjectionMutation.mutate(id)}
                    isDeleting={deleteProjectionMutation.isPending}
                  />
                ))}
              </div>
              
              <Pagination 
                currentPage={currentPage}
                totalItems={tabFilteredProjections.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="rental">
          {isLoading ? (
            <ProjectionsSkeleton />
          ) : tabFilteredProjections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <LineChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-1">Nenhuma projeção de Rentabilidade encontrada</h3>
              <p className="text-[#6B7280] mb-4">Comece criando sua primeira projeção imobiliária</p>
              <Link href="/projections/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Projeção
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {getPaginatedItems(tabFilteredProjections).map((projection) => (
                  <ProjectionCard 
                    key={projection.id} 
                    projection={projection} 
                    onDelete={(id) => deleteProjectionMutation.mutate(id)}
                    isDeleting={deleteProjectionMutation.isPending}
                  />
                ))}
              </div>
              
              <Pagination 
                currentPage={currentPage}
                totalItems={tabFilteredProjections.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}