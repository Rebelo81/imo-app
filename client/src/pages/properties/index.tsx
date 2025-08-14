import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Search, Building, Building2, HomeIcon, Trash2, Edit, MapPin, DollarSign, Type, ArrowLeft, X, FileText, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Property form schema
const propertyFormSchema = z.object({
  name: z.string().min(1, "Nome do imóvel é obrigatório"),
  type: z.string().min(1, "Tipo do imóvel é obrigatório"),
  unit: z.string().optional(),
  area: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  address: z.string().min(1, "Endereço é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().optional(),
  listPrice: z.string().optional(),
  websiteUrl: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

// Property Creation Form component
interface PropertyCreationFormProps {
  onSubmit: (values: PropertyFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: Partial<PropertyFormValues>;
}

function PropertyCreationForm({ 
  onSubmit, 
  onCancel, 
  isSubmitting,
  defaultValues 
}: PropertyCreationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaultValues || {
      name: "",
      type: "",
      unit: "",
      area: "",
      description: "",
      imageUrl: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      listPrice: "",
      websiteUrl: "",
    },
  });

  // Watch form values for progress indicator
  const formValues = form.watch();

  // Handle form submission
  const handleSubmit = (values: PropertyFormValues) => {
    onSubmit(values);
  };

  // Go to next step
  const goToNextStep = () => {
    if (currentStep === 0) {
      // Validate fields in the current step before proceeding
      form.trigger(["name", "type", "area", "description", "imageUrl", "unit"]).then((isValid) => {
        if (isValid) {
          setCurrentStep(1);
        }
      });
    } else {
      form.handleSubmit(handleSubmit)();
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-center items-center mb-4 md:mb-6">
        <div className="w-full md:w-3/4 grid grid-cols-2 gap-4 md:gap-8">
          <div 
            className={`flex flex-col items-center py-2 md:py-4 ${currentStep === 0 ? 'border-b-2 border-primary' : 'border-b-2 border-gray-200'}`}
            onClick={() => setCurrentStep(0)}
            style={{cursor: 'pointer'}}
          >
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-3 ${currentStep === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Home className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className={`text-xs md:text-sm font-medium whitespace-nowrap ${currentStep === 0 ? 'text-primary' : 'text-gray-400'}`}>
              Informações do Imóvel
            </div>
          </div>
          
          <div 
            className={`flex flex-col items-center py-2 md:py-4 ${currentStep === 1 ? 'border-b-2 border-primary' : 'border-b-2 border-gray-200'}`}
            onClick={() => currentStep === 0 ? goToNextStep() : setCurrentStep(1)}
            style={{cursor: 'pointer'}}
          >
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-3 ${currentStep === 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
              <MapPin className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className={`text-xs md:text-sm font-medium whitespace-nowrap ${currentStep === 1 ? 'text-primary' : 'text-gray-400'}`}>
              Localização
            </div>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form>
          {/* Step 1: Informações Básicas do Imóvel */}
          {currentStep === 0 && (
            <div className="space-y-4 md:space-y-6">
              <div className="text-center mb-2">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Informe os dados básicos e características do imóvel
                </p>
              </div>
              
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                    Dados do Imóvel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <Home className="h-4 w-4 text-[#434BE6]" />
                            Nome do Imóvel
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Edifício Central Park" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <MapPin className="h-4 w-4 text-[#434BE6]" />
                            Unidade (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Apto 1201, Casa 05" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <Type className="h-4 w-4 text-[#434BE6]" />
                            Tipo de Imóvel
                          </FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Residencial">Residencial</SelectItem>
                              <SelectItem value="Comercial">Comercial</SelectItem>
                              <SelectItem value="Terreno">Terreno</SelectItem>
                              <SelectItem value="Rural">Rural</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <ArrowLeft className="h-4 w-4 text-[#434BE6]" />
                            Área (m²) (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: 85" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  

                  
                  <div className="flex flex-col items-center mb-3 md:mb-4">
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-lg">
                          <FormLabel className="flex items-center gap-2 text-xs md:text-[14px] justify-center">
                            <FileText className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                            Imagem do Imóvel (opcional)
                          </FormLabel>
                          <div className="flex flex-col gap-2">
                            {field.value ? (
                              <div className="rounded-md overflow-hidden border w-full h-[140px] md:h-[180px] flex items-center justify-center bg-gray-50 relative group">
                                <img 
                                  src={field.value} 
                                  alt="Imagem do imóvel" 
                                  className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      // Se for uma URL da API, tentar remover o arquivo do servidor
                                      if (field.value && !field.value.startsWith('data:')) {
                                        const filename = field.value.split('/').pop();
                                        if (filename) {
                                          fetch(`/api/uploads/properties/${filename}`, {
                                            method: 'DELETE'
                                          }).catch(err => console.error('Erro ao remover imagem:', err));
                                        }
                                      }
                                      field.onChange("");
                                    }}
                                    className="absolute top-2 right-2"
                                  >
                                    <X className="h-3 w-3 md:h-4 md:w-4 mr-1" /> 
                                    <span className="text-xs md:text-sm">Remover</span>
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed border-gray-300 rounded-md p-4 md:p-6 h-[140px] md:h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-[#434BE6]/50 transition-colors bg-gray-50/50 text-center">
                                <div className="w-12 h-12 md:w-16 md:h-16 mb-2 rounded-full bg-[#434BE6]/10 flex items-center justify-center">
                                  <Building2 className="h-6 w-6 md:h-8 md:w-8 text-[#434BE6]" />
                                </div>
                                <p className="text-xs md:text-sm font-medium text-gray-700">Clique para adicionar uma foto do imóvel</p>
                                <p className="text-xs text-gray-500 mt-1 hidden md:block">ou arraste uma imagem para cá</p>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        // Validar tamanho do arquivo no cliente antes de enviar
                                        const fileSizeMB = file.size / (1024 * 1024);
                                        if (fileSizeMB > 5) {
                                          // Definir erro no formulário
                                          form.setError("imageUrl", {
                                            message: "A imagem deve ter no máximo 5MB"
                                          });
                                          return;
                                        }
                                        
                                        // Validar formato do arquivo
                                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                                        if (!validTypes.includes(file.type)) {
                                          // Definir erro no formulário
                                          form.setError("imageUrl", {
                                            message: "A imagem deve ser PNG ou JPEG"
                                          });
                                          return;
                                        }
                                        
                                        // Criar um FormData para enviar o arquivo
                                        const formData = new FormData();
                                        formData.append('image', file);
                                        
                                        // Enviar para o endpoint de upload
                                        const response = await fetch('/api/uploads/properties', {
                                          method: 'POST',
                                          body: formData,
                                        });
                                        
                                        // Se o upload falhar, tentar pegar a mensagem de erro específica
                                        if (!response.ok) {
                                          let errorMessage = "Erro ao fazer upload da imagem";
                                          try {
                                            const errorData = await response.json();
                                            errorMessage = errorData.error || errorMessage;
                                          } catch (e) {
                                            // Se não conseguir obter o JSON de erro, usar mensagem padrão
                                            if (response.status === 413) {
                                              errorMessage = "A imagem deve ter no máximo 5MB";
                                            }
                                          }
                                          
                                          // Mostrar erro no formulário
                                          form.setError("imageUrl", {
                                            message: errorMessage
                                          });
                                          return;
                                        }
                                        
                                        const data = await response.json();
                                        
                                        // Salvar apenas a URL da imagem no campo
                                        field.onChange(data.file.url);
                                        
                                        // Limpar erros do campo
                                        form.clearErrors("imageUrl");
                                      } catch (error: any) {
                                        console.error('Erro no upload:', error);
                                        // Mostrar erro no formulário
                                        form.setError("imageUrl", {
                                          message: "Não foi possível fazer o upload da imagem"
                                        });
                                      }
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                          <FormDescription className="text-xs mt-2 text-center">
                            Adicione uma foto do imóvel para facilitar a identificação
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-lg mt-4">
                          <FormLabel className="flex items-center gap-2 text-[14px] justify-center">
                            <FileText className="h-4 w-4 text-[#434BE6]" />
                            Link do Imóvel (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://www.imobiliaria.com.br/imovel/123" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-center">
                            Link para o site da imobiliária com detalhes do imóvel
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-[14px]">
                          <FileText className="h-4 w-4 text-[#434BE6]" />
                          Descrição (opcional)
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva as características do imóvel..." 
                            {...field}
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 2: Localização */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Informe os dados de localização do imóvel
                </p>
              </div>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#434BE6]" />
                    Endereço Completo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-[14px]">
                          <MapPin className="h-4 w-4 text-[#434BE6]" />
                          Endereço
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Rua das Palmeiras, 123" 
                            {...field} 
                            className="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <MapPin className="h-4 w-4 text-[#434BE6]" />
                            Bairro
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Jardim América" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <MapPin className="h-4 w-4 text-[#434BE6]" />
                            CEP (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: 01234-567" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <MapPin className="h-4 w-4 text-[#434BE6]" />
                            Cidade
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: São Paulo" 
                              {...field} 
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-[14px]">
                            <MapPin className="h-4 w-4 text-[#434BE6]" />
                            Estado
                          </FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione o estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AC">Acre</SelectItem>
                              <SelectItem value="AL">Alagoas</SelectItem>
                              <SelectItem value="AP">Amapá</SelectItem>
                              <SelectItem value="AM">Amazonas</SelectItem>
                              <SelectItem value="BA">Bahia</SelectItem>
                              <SelectItem value="CE">Ceará</SelectItem>
                              <SelectItem value="DF">Distrito Federal</SelectItem>
                              <SelectItem value="ES">Espírito Santo</SelectItem>
                              <SelectItem value="GO">Goiás</SelectItem>
                              <SelectItem value="MA">Maranhão</SelectItem>
                              <SelectItem value="MT">Mato Grosso</SelectItem>
                              <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                              <SelectItem value="MG">Minas Gerais</SelectItem>
                              <SelectItem value="PA">Pará</SelectItem>
                              <SelectItem value="PB">Paraíba</SelectItem>
                              <SelectItem value="PR">Paraná</SelectItem>
                              <SelectItem value="PE">Pernambuco</SelectItem>
                              <SelectItem value="PI">Piauí</SelectItem>
                              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                              <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                              <SelectItem value="RO">Rondônia</SelectItem>
                              <SelectItem value="RR">Roraima</SelectItem>
                              <SelectItem value="SC">Santa Catarina</SelectItem>
                              <SelectItem value="SP">São Paulo</SelectItem>
                              <SelectItem value="SE">Sergipe</SelectItem>
                              <SelectItem value="TO">Tocantins</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
                    
          {/* Navigation buttons */}
          <div className="flex justify-between pt-4 md:pt-6">
            {currentStep > 0 ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={goToPreviousStep}
                className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2"
              >
                Voltar
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2"
              >
                Cancelar
              </Button>
            )}
            
            <Button 
              type="button" 
              onClick={goToNextStep}
              disabled={isSubmitting}
              className="text-xs md:text-sm px-3 md:px-4 py-2 md:py-2"
            >
              {currentStep === 1 ? (
                isSubmitting ? "Salvando..." : "Salvar Imóvel"
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCity, setSelectedCity] = useState("any");
  const [sortOrder, setSortOrder] = useState("recent");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch properties data
  const { data: properties = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/properties'],
    staleTime: 60000, // 1 minute
  });

  // Create property mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/properties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Imóvel cadastrado",
        description: "O imóvel foi cadastrado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar imóvel",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Update property mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/properties/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Imóvel atualizado",
        description: "As informações do imóvel foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar imóvel",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete property mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Imóvel removido",
        description: "O imóvel foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover imóvel",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Extract unique cities from properties for filter dropdown
  const uniqueCities = useMemo(() => {
    if (!properties || properties.length === 0) return [];
    const cities = properties
      .map((property: any) => property.city)
      .filter((city: string) => city && city.trim() !== "")
      .filter((city: string, index: number, array: string[]) => array.indexOf(city) === index)
      .sort();
    return cities;
  }, [properties]);

  // Filter and sort properties
  const filteredProperties = isLoading
    ? []
    : properties
        .filter((property: any) => {
          // Filter by search term
          const matchesSearch = 
              (property.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (property.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (property.neighborhood?.toLowerCase() || '').includes(searchTerm.toLowerCase());

          // Filter by type (tab)
          const matchesType = 
            activeTab === "all" ||
            (activeTab === "residential" && (property.type === "residential" || property.type === "Residencial")) ||
            (activeTab === "commercial" && (property.type === "commercial" || property.type === "Comercial")) ||
            (activeTab === "land" && (property.type === "land" || property.type === "Terreno"));
            
          // Filter by city
          const matchesCity = 
            selectedCity === "any" || 
            (property.city === selectedCity);

          return matchesSearch && matchesType && matchesCity;
        })
        .sort((a: any, b: any) => {
          // Sort by selected order
          switch (sortOrder) {
            case "name-asc":
              return (a.name || "").localeCompare(b.name || "");
            case "name-desc":
              return (b.name || "").localeCompare(a.name || "");
            case "area-asc":
              return (parseFloat(a.area) || 0) - (parseFloat(b.area) || 0);
            case "area-desc":
              return (parseFloat(b.area) || 0) - (parseFloat(a.area) || 0);
            case "recent":
            default:
              // Sort by ID descending (assuming newer items have higher IDs)
              // Alternatively, use createdAt if available
              return b.id - a.id;
          }
        });

  // Handle property create
  const handleCreateProperty = (data: any) => {
    console.log("Dados do formulário:", data);
    
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    // Usar o userId autenticado
    const propertyData = {
      ...data,
      userId: user.id
    };
    // Converter área para número se for string
    if (propertyData.area && typeof propertyData.area === 'string') {
      propertyData.area = parseFloat(propertyData.area) || null;
    }
    console.log("Dados enviados para o servidor:", propertyData);
    createMutation.mutate(propertyData);
  };

  // Handle property edit
  const handleEditProperty = (data: any) => {
    if (selectedProperty) {
      // Converter área para número se for string
      if (data.area && typeof data.area === 'string') {
        data.area = parseFloat(data.area) || null;
      }
      // Converter preço para número se for string
      if (data.listPrice && typeof data.listPrice === 'string') {
        data.listPrice = parseFloat(data.listPrice) || null;
      }
      // Adicionar userId e id manualmente
      const propertyData = {
        ...data,
        id: selectedProperty.id,
        userId: selectedProperty.userId || 1
      };
      console.log("Enviando dados atualizados:", propertyData);
      updateMutation.mutate(propertyData);
    }
  };

  // Handle property delete
  const handleDeleteProperty = () => {
    if (selectedProperty) {
      deleteMutation.mutate(selectedProperty.id);
    }
  };

  // Property card component
  const PropertyCard = ({ property }: { property: any }) => {
    return (
      <Card className="overflow-hidden group hover:shadow-md transition-all duration-200 flex flex-col h-full">
        {/* Image area with overlay for property ID */}
        <div className="aspect-video bg-slate-100 relative overflow-hidden">
          {property.imageUrl ? (
            <img 
              src={property.imageUrl} 
              alt={property.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              onError={(e) => {
                // Se a imagem falhar ao carregar, mostrar o ícone padrão
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          
          <div className={`absolute inset-0 flex items-center justify-center ${property.imageUrl ? 'hidden' : ''}`}>
            {property.type === "residential" || property.type === "Residencial" ? (
              <Home className="h-16 w-16 text-slate-300" />
            ) : property.type === "commercial" || property.type === "Comercial" ? (
              <Building className="h-16 w-16 text-slate-300" />
            ) : (
              <MapPin className="h-16 w-16 text-slate-300" />
            )}
          </div>
          
          {/* Property ID badge */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-md">
            ID #{property.userSequentialId || property.id}
          </div>
          
          {/* Property type badge */}
          <Badge className="absolute top-3 right-3" variant={
            property.type === "residential" || property.type === "Residencial" ? "default" : 
            property.type === "commercial" || property.type === "Comercial" ? "secondary" : 
            "outline"
          }>
            {(property.type === "residential" || property.type === "Residencial") && "Residencial"}
            {(property.type === "commercial" || property.type === "Comercial") && "Comercial"}
            {(property.type === "land" || property.type === "Terreno") && "Terreno"}
          </Badge>
        </div>
        
        <CardContent className="p-3 md:p-4 flex-1 flex flex-col">
          {/* Property name and location */}
          <div className="mb-2 md:mb-3">
            <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-1">{property.name}</h3>
            <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{property.city}/{property.state}</span>
            </p>
          </div>
          
          {/* Property specs */}
          <div className="grid grid-cols-2 gap-x-3 md:gap-x-4 gap-y-1 md:gap-y-2 mt-auto text-xs md:text-sm">
            {property.area && (
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-slate-500">Área:</span>
                <span className="font-medium">{property.area} m²</span>
              </div>
            )}
            {property.unit && (
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-slate-500">Unidade:</span>
                <span className="font-medium">{property.unit}</span>
              </div>
            )}
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-slate-500">Quartos:</span>
                <span className="font-medium">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-slate-500">Banheiros:</span>
                <span className="font-medium">{property.bathrooms}</span>
              </div>
            )}
            {property.listPrice && (
              <div className="col-span-2 flex items-center mt-1">
                <span className="text-slate-500 mr-2">Preço:</span>
                <span className="font-semibold text-primary">{formatCurrency(property.listPrice)}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-0 border-t">
          <div className="grid grid-cols-3 w-full divide-x">
            {property.websiteUrl && (
              <a 
                href={property.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="col-span-1 p-2 text-xs flex justify-center items-center text-primary hover:bg-slate-50 transition-colors"
              >
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Site
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="col-span-1 rounded-none h-auto py-2 text-xs"
              onClick={() => {
                setSelectedProperty(property);
                setIsEditDialogOpen(true);
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="col-span-1 rounded-none h-auto py-2 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedProperty(property);
                setIsDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Imóveis</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="text-xs md:text-sm px-2 md:px-4">
          <HomeIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Novo Imóvel</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <div className="bg-slate-50 p-3 md:p-4 rounded-lg border mb-4 md:mb-6">
        <div className="flex w-full items-center space-x-2 mb-3 md:mb-4">
          <Input
            placeholder="Buscar por título, endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs md:text-sm"
          />
          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10">
            <Search className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
          <div>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full text-xs md:text-sm">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todas as cidades</SelectItem>
                {uniqueCities.map((city: string) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full text-xs md:text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="area-asc">Área (menor-maior)</SelectItem>
                <SelectItem value="area-desc">Área (maior-menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Filtros de tipo integrados - simplificados */}
        <div className="mt-3 md:mt-4">
          <div className="grid grid-cols-4 gap-2 w-full">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                activeTab === "all" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background border border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab("residential")}
              className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                activeTab === "residential" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background border border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Residencial
            </button>
            <button
              onClick={() => setActiveTab("commercial")}
              className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                activeTab === "commercial" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background border border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Comercial
            </button>
            <button
              onClick={() => setActiveTab("land")}
              className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                activeTab === "land" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background border border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Terrenos
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo dos imóveis */}
      <div className="mt-4 md:mt-6">
          {isLoading ? (
            // Loading state
            <div className="h-[300px] md:h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProperties.length > 0 ? (
            // Property grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredProperties.map((property: any) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            // Empty state
            <Card>
              <CardContent className="h-[250px] md:h-[300px] flex flex-col items-center justify-center text-center p-4 md:p-6">
                <HomeIcon className="h-12 w-12 md:h-16 md:w-16 text-slate-200 mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium">Nenhum imóvel encontrado</h3>
                <p className="text-slate-500 mt-1 max-w-md text-xs md:text-sm">
                  {searchTerm 
                    ? `Nenhum resultado para "${searchTerm}". Tente outro termo.`
                    : "Adicione seu primeiro imóvel para começar a criar projeções."}
                </p>
                {!searchTerm && (
                  <Button 
                    className="mt-3 md:mt-4 text-xs md:text-sm px-3 md:px-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <HomeIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    Adicionar Imóvel
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
      </div>

      {/* Create Property Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto pt-4 md:pt-6">
          <DialogTitle className="sr-only">Novo Imóvel</DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os dados do imóvel para cadastrá-lo no sistema.
          </DialogDescription>
          {/* Multi-step form for property creation */}
          <div>
            <PropertyCreationForm
              key={isCreateDialogOpen ? 'create-form' : 'closed'}
              onSubmit={handleCreateProperty}
              onCancel={() => setIsCreateDialogOpen(false)}
              isSubmitting={createMutation.isPending}
              defaultValues={{
                name: "",
                type: "",
                unit: "",
                area: "",
                description: "",
                imageUrl: "",
                address: "",
                neighborhood: "",
                city: "",
                state: "",
                zipCode: "",
                listPrice: "",
                websiteUrl: "",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto pt-4 md:pt-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Editar Imóvel</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Altere os dados do imóvel selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <PropertyCreationForm
              onSubmit={handleEditProperty}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={updateMutation.isPending}
              defaultValues={{
                name: selectedProperty.name || "",
                type: selectedProperty.type || "",
                unit: selectedProperty.unit || "",
                area: selectedProperty.area?.toString() || "",
                description: selectedProperty.description || "",
                imageUrl: selectedProperty.imageUrl || "",
                address: selectedProperty.address || "",
                neighborhood: selectedProperty.neighborhood || "",
                city: selectedProperty.city || "",
                state: selectedProperty.state || "",
                zipCode: selectedProperty.zipCode || "",
                listPrice: selectedProperty.listPrice?.toString() || "",
                websiteUrl: selectedProperty.websiteUrl || "",
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O imóvel será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <>
              <div className="py-4">
                <p className="mb-3">
                  Tem certeza que deseja excluir o imóvel <span className="font-semibold">{selectedProperty.name}</span>?
                </p>
                <div className="flex items-center p-3 bg-red-50 border border-red-100 rounded-md text-sm">
                  <Trash2 className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                  <p className="text-gray-700">
                    Todos os dados associados a este imóvel serão removidos permanentemente.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteProperty}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir Imóvel"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}