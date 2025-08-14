import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, RefreshCw, Activity, Calendar, Info, Eye, User, Building, Lock, Upload, X, Image, EyeOff, Mail, CreditCard } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schemas para o perfil
const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

const companySchema = z.object({
  company: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileData = z.infer<typeof profileSchema>;
type CompanyData = z.infer<typeof companySchema>;
type PasswordData = z.infer<typeof passwordSchema>;

// Tipos para os dados dos índices
interface IndexData {
  month: string;
  value: number;
  createdAt: string;
}

interface IndexSummary {
  average: number | null;
  lastMonth: {
    month: string;
    value: number;
  } | null;
  dataCount: number;
}

interface SelicMetaSummary {
  value: number;
  updatedAt: string;
}

interface SelicAcumuladaSummary {
  value: number;
  referenceDate: string;
}

interface IndexDetails {
  indexType: string;
  average: number | null;
  data: IndexData[];
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Estados do perfil
  const { user, refreshUser } = useAuth();
  
  // Hook para verificar acesso da assinatura
  const { data: subscriptionAccess } = useQuery({
    queryKey: ['/api/users/subscription-access'],
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Configurar aba ativa baseada na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['profile', 'subscription', 'financial'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funções do perfil
  const getCurrentImage = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.photo) return user.photo;
    return null;
  };
  
  const hasNewImage = () => avatarFile !== null;

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const companyForm = useForm<CompanyData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company: user?.company || "",
    },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation para acessar o Customer Portal do Stripe
  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/portal");
    },
    onSuccess: (data) => {
      // Abrir o Customer Portal do Stripe em uma nova aba
      window.open(data.url, '_blank');
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao acessar portal de assinatura",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar checkout de reativação
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/create-reactivation-checkout");
    },
    onSuccess: (data) => {
      // Redirecionar para o checkout do Stripe
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar checkout de reativação",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      return await apiRequest("PATCH", "/api/users/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyData) => {
      return await apiRequest("PATCH", "/api/users/company", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Dados da empresa atualizados com sucesso!",
      });
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados da empresa",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordData) => {
      return await apiRequest("PATCH", "/api/users/password", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/uploads/user-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload do avatar');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!",
      });
      refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do avatar",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitCompany = (data: CompanyData) => {
    updateCompanyMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        title: "Erro",
        description: "Apenas arquivos PNG e JPEG são aceitos",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = () => {
    if (avatarFile) {
      uploadAvatarMutation.mutate(avatarFile);
    }
  };

  // Query para buscar resumo dos índices
  const { data: indexesSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['/api/financial-indexes'],
    queryFn: async (): Promise<Record<string, IndexSummary | SelicMetaSummary | SelicAcumuladaSummary>> => {
      const response = await fetch('/api/financial-indexes');
      if (!response.ok) {
        throw new Error('Falha ao carregar índices financeiros');
      }
      return response.json();
    }
  });

  // Query para buscar detalhes de um índice específico
  const { data: indexDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/financial-indexes', selectedIndex],
    queryFn: async (): Promise<IndexDetails> => {
      const response = await fetch(`/api/financial-indexes/${selectedIndex}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar detalhes do índice');
      }
      return response.json();
    },
    enabled: !!selectedIndex
  });

  // Mutation para coleta manual
  const collectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/financial-indexes/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Falha ao executar coleta');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Coleta de índices executada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-indexes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao executar coleta",
        variant: "destructive",
      });
    }
  });

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year.substring(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getIndexName = (type: string) => {
    const names: Record<string, string> = {
      ipca: 'IPCA',
      igpm: 'IGP-M',
      selic: 'SELIC',
      cdi: 'CDI',
      incc: 'INCC-M',
      cub_sc: 'CUB-SC'
    };
    return names[type] || type.toUpperCase();
  };

  const getIndexDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      ipca: 'Índice Nacional de Preços ao Consumidor Amplo',
      igpm: 'Índice Geral de Preços do Mercado',
      selic: 'Taxa Selic acumulada mensal (últimos 12 meses)',
      cdi: 'Taxa do CDI acumulada no ano',
      incc: 'Índice Nacional da Construção Civil - Mercado (FGV)',
      cub_sc: 'Custo Unitário Básico - Santa Catarina (Sinduscon BC)'
    };
    return descriptions[type] || '';
  };

  const renderIndexCard = (type: string, summary: IndexSummary) => (
    <Card key={type} className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-lg">{getIndexName(type)}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {summary.dataCount} meses
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {getIndexDescription(type)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Média 12 meses</p>
            <p className="text-sm font-medium">
              {summary.average ? formatPercentage(summary.average) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Último mês</p>
            <p className="text-sm font-medium">
              {summary.lastMonth ? formatPercentage(summary.lastMonth.value) : 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Exibir SELIC meta apenas para o card da SELIC */}
        {type === 'selic' && indexesSummary?.selic_meta && 'value' in indexesSummary.selic_meta && (
          <div className="border-t pt-3 mt-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Taxa SELIC meta definida pelo Copom (referência anual)
              </p>
              <p className="text-lg font-bold text-blue-900">
                {indexesSummary.selic_meta.value ? formatPercentage(indexesSummary.selic_meta.value) : 'N/A'} a.a.
              </p>
              {'updatedAt' in indexesSummary.selic_meta && indexesSummary.selic_meta.updatedAt && (
                <p className="text-xs text-blue-600 mt-1">
                  Atualizado em: {new Date(indexesSummary.selic_meta.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        )}
        
        {summary.lastMonth && (
          <div>
            <p className="text-xs text-muted-foreground">Referência</p>
            <p className="text-xs">{formatMonth(summary.lastMonth.month)}</p>
          </div>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={() => setSelectedIndex(type)}
            >
              <Eye className="h-3 w-3" />
              Ver detalhes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                {getIndexName(type)} - Últimos 12 meses
              </DialogTitle>
              <DialogDescription>
                {getIndexDescription(type)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {indexDetails && (indexDetails.indexType === type.toUpperCase() || (type === 'incc' && indexDetails.indexType === 'INCC') || (type === 'cub_sc' && indexDetails.indexType === 'CUB-SC')) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Média do período</p>
                      <p className="text-lg font-semibold">
                        {indexDetails.average ? formatPercentage(indexDetails.average) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de registros</p>
                      <p className="text-lg font-semibold">{indexDetails.data.length}</p>
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {indexDetails.data.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-medium">{formatMonth(item.month)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatPercentage(item.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum dado encontrado</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie as configurações do sistema e suas informações pessoais
        </p>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="profile" className="text-xs md:text-base font-semibold flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-3">
            <User className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Meu Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs md:text-base font-semibold flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-3">
            <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Minha Assinatura</span>
            <span className="sm:hidden">Assinatura</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs md:text-base font-semibold flex-col md:flex-row gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-3">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Índices Financeiros</span>
            <span className="sm:hidden">Índices</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba Meu Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <div className="space-y-3 md:space-y-8">
            {/* Dados Pessoais */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-[#1F2937] text-lg md:text-xl font-bold">
                  <User className="h-5 w-5 md:h-6 md:w-6 text-[#434BE6]" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription className="text-[#6B7280] text-sm md:text-base">
                  Atualize suas informações pessoais básicas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 md:space-y-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm">Nome Completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Seu nome completo" 
                                {...field} 
                                className="h-8 md:h-10 text-xs md:text-[14px]"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] md:text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <div>
                        <FormLabel className="text-xs md:text-sm">Email</FormLabel>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {user?.email}
                          </span>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                          Entre em contato com o suporte para alterar seu email
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Dados da Empresa */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-[#1F2937] text-lg md:text-xl font-bold">
                  <Building className="h-5 w-5 md:h-6 md:w-6 text-[#434BE6]" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription className="text-[#6B7280] text-sm md:text-base">
                  Informações da sua empresa (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 md:space-y-6">
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-4 md:space-y-6">
                    <FormField
                      control={companyForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs md:text-sm">Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome da sua empresa (opcional)" 
                              {...field} 
                              className="h-8 md:h-10 text-xs md:text-[14px]"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] md:text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <Button 
                        type="submit" 
                        disabled={updateCompanyMutation.isPending}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        {updateCompanyMutation.isPending ? "Salvando..." : "Salvar Empresa"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Logotipo da Empresa */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-[#1F2937] text-lg md:text-xl font-bold">
                  <Image className="h-5 w-5 md:h-6 md:w-6 text-[#434BE6]" />
                  Logotipo da Empresa
                </CardTitle>
                <CardDescription className="text-[#6B7280] text-sm md:text-base">
                  Adicione o logotipo da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center space-y-4 md:space-y-6">
                  <div className="flex flex-col items-center space-y-2 md:space-y-4">
                    {getCurrentImage() ? (
                      <div className="relative">
                        <img
                          src={getCurrentImage()!}
                          alt="Logotipo"
                          className="w-16 h-16 md:w-24 md:h-24 rounded-lg object-cover border-2 border-gray-200"
                        />
                        {hasNewImage() && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Building className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        <Upload className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        Escolher Arquivo
                      </Button>

                      {avatarFile && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={removeFile}
                          className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                          Remover
                        </Button>
                      )}
                    </div>

                    {avatarFile && (
                      <Button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={uploadAvatarMutation.isPending}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        {uploadAvatarMutation.isPending ? "Enviando..." : "Enviar Logotipo"}
                      </Button>
                    )}
                  </div>

                  <p className="text-[10px] md:text-xs text-center text-muted-foreground max-w-sm">
                    Formatos aceitos: PNG, JPEG. Tamanho máximo: 5MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Segurança */}
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-[#1F2937] text-lg md:text-xl font-bold">
                  <Lock className="h-5 w-5 md:h-6 md:w-6 text-[#434BE6]" />
                  Segurança
                </CardTitle>
                <CardDescription className="text-[#6B7280] text-sm md:text-base">
                  Altere sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 md:space-y-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4 md:space-y-6">
                    <div className="space-y-3 md:space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm">Senha Atual</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPassword ? "text" : "password"}
                                  placeholder="Digite sua senha atual"
                                  {...field}
                                  className="h-7 md:h-8 text-xs md:text-[14px] pr-8 md:pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-7 md:h-8 px-2 md:px-3 hover:bg-transparent"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                                  ) : (
                                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px] md:text-xs" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm">Nova Senha</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Digite sua nova senha"
                                    {...field}
                                    className="h-7 md:h-8 text-xs md:text-[14px] pr-8 md:pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-7 md:h-8 px-2 md:px-3 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                                    ) : (
                                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-[10px] md:text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm">Confirmar Nova Senha</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirme sua nova senha"
                                    {...field}
                                    className="h-7 md:h-8 text-xs md:text-[14px] pr-8 md:pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-7 md:h-8 px-2 md:px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                                    ) : (
                                      <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-[10px] md:text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => passwordForm.reset()}
                        className="h-8 md:h-10 text-xs md:text-sm px-4 md:px-6 w-full md:w-auto"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Minha Assinatura */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="space-y-3 md:space-y-8">
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-[#1F2937] text-lg md:text-xl font-bold">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-[#434BE6]" />
                  Minha Assinatura
                </CardTitle>
                <CardDescription className="text-[#6B7280] text-sm md:text-base">
                  Gerencie seu plano Premium e informações de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-6">
                {/* Status da Assinatura */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">Plano Premium</h4>
                      <Badge 
                        variant={
                          user?.subscriptionStatus === 'active' ? 'default' :
                          user?.subscriptionStatus === 'cancel_at_period_end' ? 'secondary' :
                          user?.subscriptionStatus === 'canceled' ? 'destructive' :
                          user?.subscriptionStatus === 'trialing' ? 'outline' :
                          'secondary'
                        }
                        className="text-sm px-4 py-1.5 font-medium"
                      >
                        {user?.subscriptionStatus === 'active' ? 'Ativo' : 
                         user?.subscriptionStatus === 'cancel_at_period_end' ? 'Cancelamento Agendado' :
                         user?.subscriptionStatus === 'canceled' ? 'Cancelado' :
                         user?.subscriptionStatus === 'trialing' ? 'Período de Teste' :
                         user?.subscriptionStatus === 'paused' ? 'Pausado' :
                         'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Acesso completo à plataforma</p>
                  </div>
                  
                  {/* Notificações baseadas no status */}
                  {user?.subscriptionStatus === 'active' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Sua assinatura está ativa! Você tem acesso completo até{' '}
                        <span className="font-semibold">
                          {user?.subscriptionCurrentPeriodEnd 
                            ? new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('pt-BR')
                            : 'a próxima cobrança'}
                        </span>
                        .
                      </p>
                    </div>
                  )}
                  
                  {user?.subscriptionStatus === 'cancel_at_period_end' && user?.subscriptionCurrentPeriodEnd && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ Sua assinatura será cancelada em{' '}
                        <span className="font-semibold">
                          {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('pt-BR')}
                        </span>
                        . Você pode reativar a qualquer momento através do portal do cliente.
                      </p>
                    </div>
                  )}
                  
                  {user?.subscriptionStatus === 'canceled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800 font-medium">
                        ❌ {subscriptionAccess?.status === 'completely_canceled' ? 
                          'Sua assinatura foi encerrada. Para continuar utilizando o sistema, clique abaixo para reativar sua conta.' :
                          'Sua assinatura foi cancelada. Reative sua assinatura para continuar usando o sistema.'
                        }
                      </p>
                    </div>
                  )}
                  
                  {user?.subscriptionStatus === 'trialing' && user?.subscriptionCurrentPeriodEnd && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 font-medium">
                        🎯 Você está no período de teste até{' '}
                        <span className="font-semibold">
                          {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('pt-BR')}
                        </span>
                        . Aproveite para explorar todos os recursos!
                      </p>
                    </div>
                  )}
                  
                  {user?.subscriptionStatus === 'paused' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 font-medium">
                        ⏸️ Sua assinatura está pausada. Entre em contato com o suporte para reativar.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Valor mensal</p>
                      <p className="font-semibold">R$ 97,00</p>
                    </div>
                    {user?.subscriptionCurrentPeriodEnd && (
                      <div>
                        <p className="text-gray-600">
                          {user?.subscriptionStatus === 'cancel_at_period_end' ? 'Válido até' : 'Próxima cobrança'}
                        </p>
                        <p className="font-semibold">
                          {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gerenciar Assinatura */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Gerenciar Assinatura</h4>
                  
                  {/* Mostrar botão "Assinar novamente" para assinatura completamente cancelada */}
                  {subscriptionAccess?.status === 'completely_canceled' ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Sua assinatura foi encerrada. Reative agora para continuar usando todos os recursos da plataforma.
                      </p>
                      
                      <Button
                        onClick={() => createCheckoutMutation.mutate()}
                        disabled={createCheckoutMutation.isPending}
                        className="w-full md:w-auto bg-[#434BE6] hover:bg-[#3A42D4] text-white"
                      >
                        {createCheckoutMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        {createCheckoutMutation.isPending ? 'Processando...' : 'Assinar novamente'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Use o portal do cliente para atualizar suas informações de pagamento, 
                        baixar faturas ou cancelar sua assinatura.
                      </p>
                      
                      <Button
                        onClick={() => customerPortalMutation.mutate()}
                        disabled={customerPortalMutation.isPending || !user?.stripeCustomerId}
                        className="w-full md:w-auto"
                      >
                        {customerPortalMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        {customerPortalMutation.isPending ? 'Carregando...' : 'Acessar Portal do Cliente'}
                      </Button>
                      
                      {!user?.stripeCustomerId && (
                        <p className="text-xs text-red-600">
                          Portal indisponível: dados de cliente não encontrados
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Informações Adicionais */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Portal Seguro do Stripe</p>
                      <p className="text-blue-700">
                        Você será redirecionado para o portal seguro do Stripe, onde poderá 
                        gerenciar todos os aspectos da sua assinatura com total segurança.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Índices Financeiros */}
        <TabsContent value="financial" className="space-y-6">
          <section className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Índices Financeiros</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Dados econômicos coletados automaticamente do Banco Central
                </p>
              </div>
              {user?.isAdmin && (
                <Button 
                  onClick={() => collectMutation.mutate()}
                  disabled={collectMutation.isPending}
                  className="gap-2 w-full md:w-auto"
                >
                  {collectMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  Atualizar agora
                </Button>
              )}
            </div>

            {/* Grid de índices */}
            {isLoadingSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : indexesSummary ? (
              <div className="space-y-6 md:space-y-8">
                {/* Seção Taxa SELIC */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Taxa SELIC</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    {/* SELIC Acumulada */}
                    {indexesSummary.selic_acumulada && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Taxa SELIC acumulada
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {(indexesSummary.selic_acumulada as SelicAcumuladaSummary).value ? 
                                  `${(indexesSummary.selic_acumulada as SelicAcumuladaSummary).value.toFixed(2)}% a.a.` : 
                                  'N/A'
                                }
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>Atualizado em: {(indexesSummary.selic_acumulada as SelicAcumuladaSummary).referenceDate ? 
                                new Date((indexesSummary.selic_acumulada as SelicAcumuladaSummary).referenceDate).toLocaleDateString('pt-BR') : 
                                'N/A'
                              }</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* SELIC Meta */}
                    {indexesSummary.selic_meta && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            Taxa SELIC meta (COPOM)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {(indexesSummary.selic_meta as SelicMetaSummary).value ? 
                                  `${(indexesSummary.selic_meta as SelicMetaSummary).value.toFixed(2)}% a.a.` : 
                                  'N/A'
                                }
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>Atualizado em: {(indexesSummary.selic_meta as SelicMetaSummary).updatedAt ? 
                                new Date((indexesSummary.selic_meta as SelicMetaSummary).updatedAt).toLocaleDateString('pt-BR') : 
                                'N/A'
                              }</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Outros Índices */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Outros Índices</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {Object.entries(indexesSummary)
                      .filter(([type]) => !['selic_meta', 'selic_acumulada', 'selic'].includes(type))
                      .map(([type, summary]) => 
                        renderIndexCard(type, summary as IndexSummary)
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Nenhum dado disponível</p>
                </CardContent>
              </Card>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
