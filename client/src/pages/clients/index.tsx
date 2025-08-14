import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserPlus, Trash2, Edit } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ClientCard from "@/components/clients/ClientCard";
import ClientForm from "@/components/clients/ClientForm";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch clients data
  const { data: clients = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch projections data
  const { data: projections = [] } = useQuery<any[]>({
    queryKey: ['/api/projections'],
  });
  
  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure any empty strings are sent as null or undefined to match schema expectations
      const clientData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        notes: data.notes || null
      };
      
      console.log("Sending client data:", clientData);
      return apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Cliente criado",
        description: "O cliente foi cadastrado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro ao criar cliente",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Cliente atualizado",
        description: "As informações do cliente foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async ({id, mode}: {id: number, mode: 'client-only' | 'client-and-projections'}) => {
      // Enviar o modo como parâmetro de consulta
      return apiRequest("DELETE", `/api/clients/${id}?mode=${mode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover cliente",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Handle client create
  const handleCreateClient = (data: any) => {
    createMutation.mutate(data);
  };
  
  // Handle client edit
  const handleEditClient = (data: any) => {
    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data });
    }
  };
  
  // Estado para controlar o modo de exclusão (cliente ou cliente+projeções)
  const [deleteMode, setDeleteMode] = useState<'client-only' | 'client-and-projections'>('client-only');
  const [hasClientWithProjections, setHasClientWithProjections] = useState(false);
  
  // Quando um cliente é selecionado para exclusão, verificamos se tem projeções
  const handlePrepareDelete = (client: any) => {
    setSelectedClient(client);
    
    // Verificar se o cliente tem projeções associadas
    const clientProjections = clients
      .filter((c: any) => c.id === client.id)
      .flatMap(() => 
        projections.filter((p: any) => p.clientId === client.id)
      );
    
    setHasClientWithProjections(clientProjections.length > 0);
    setDeleteMode('client-only'); // Resetar para o modo padrão
    setIsDeleteDialogOpen(true);
  };

  // Handle client delete
  const handleDeleteClient = () => {
    if (selectedClient) {
      // Enviar o modo de exclusão como parâmetro na query
      deleteMutation.mutate({
        id: selectedClient.id,
        mode: deleteMode
      });
    }
  };
  
  // Filter clients based on search term
  const filteredClients = isLoading
    ? []
    : clients.filter((client: any) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.includes(searchTerm))
      );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>
      
      <div className="flex w-full items-center space-x-2 mb-6">
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        // Loading state
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredClients.length > 0 ? (
        // Client grid - apenas dois por linha
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {filteredClients.map((client: any) => (
            <ClientCard 
              key={client.id} 
              client={client}
              onEdit={() => {
                setSelectedClient(client);
                setIsEditDialogOpen(true);
              }}
              onDelete={() => handlePrepareDelete(client)}
            />
          ))}
        </div>
      ) : (
        // Empty state
        <Card>
          <CardContent className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <UserPlus className="h-16 w-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-slate-500 mt-1 max-w-md">
              {searchTerm 
                ? `Nenhum resultado para "${searchTerm}". Tente outro termo.`
                : "Adicione seu primeiro cliente para começar a criar projeções."}
            </p>
            {!searchTerm && (
              <Button 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre as informações do cliente para associar às projeções
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            onSubmit={handleCreateClient}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <ClientForm 
              onSubmit={handleEditClient}
              defaultValues={selectedClient}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O cliente será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <p>
              Tem certeza que deseja excluir o cliente <span className="font-semibold">{selectedClient?.name}</span>?
            </p>
            
            {hasClientWithProjections && (
              <div className="mt-4 space-y-3 border-t pt-3">
                <p className="text-sm text-amber-600">
                  Este cliente possui projeções associadas. O que deseja fazer com elas?
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <input 
                      type="radio" 
                      id="client-only" 
                      name="delete-mode"
                      className="mt-1"
                      checked={deleteMode === 'client-only'}
                      onChange={() => setDeleteMode('client-only')}
                    />
                    <label htmlFor="client-only" className="text-sm">
                      <div className="font-medium">Manter projeções</div>
                      <div className="text-slate-500">As projeções ficarão sem cliente associado e continuarão disponíveis no sistema</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <input 
                      type="radio" 
                      id="client-and-projections" 
                      name="delete-mode"
                      className="mt-1"
                      checked={deleteMode === 'client-and-projections'}
                      onChange={() => setDeleteMode('client-and-projections')}
                    />
                    <label htmlFor="client-and-projections" className="text-sm">
                      <div className="font-medium">Excluir projeções</div>
                      <div className="text-slate-500">Todas as projeções associadas a este cliente também serão excluídas permanentemente</div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteClient}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}