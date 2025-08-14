import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Building, Lock, Upload, X, Image, Eye, EyeOff, Mail } from "lucide-react";

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

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Função para obter a imagem atual (existente ou preview)
  const getCurrentImage = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.photo) return user.photo;
    return null;
  };
  
  // Função para verificar se há uma imagem selecionada para upload
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await apiRequest("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response.json();
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
      const response = await apiRequest("/api/users/company", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response.json();
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
      const response = await apiRequest("/api/users/password", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response.json();
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
      // Upload direto usando a nova rota que já atualiza o banco de dados
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

  // Função para lidar com a seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        title: "Erro",
        description: "Apenas arquivos PNG e JPEG são aceitos",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho do arquivo
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);

    // Criar preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Função para remover arquivo selecionado ou resetar para foto existente
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

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto px-2 md:px-6 py-3 md:py-6 max-w-5xl">
      <div className="space-y-3 md:space-y-8">
        <div className="text-center">
          <h1 className="text-lg md:text-3xl font-bold text-[#1F2937] mb-1 md:mb-2">Meu Perfil</h1>
          <p className="text-[#6B7280] text-xs md:text-lg">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>

        <Separator className="my-3 md:my-8" />

        {/* Dados Pessoais */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-[#1F2937] text-sm md:text-lg">
              <User className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
              Dados Pessoais
            </CardTitle>
            <CardDescription className="text-[#6B7280] text-xs md:text-sm">
              Atualize suas informações pessoais básicas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-3 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs md:text-sm font-medium">
                          <User className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                          Nome
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} className="h-8 md:h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs md:text-sm font-medium">
                      <Mail className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                      Email
                    </Label>
                    <div className="relative">
                      <Input 
                        type="email" 
                        value={user?.email || ""} 
                        disabled 
                        className="h-8 md:h-10 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Lock className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-500">O email não pode ser alterado</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="bg-[#434be6] hover:bg-[#1D4ED8] h-8 md:h-10 text-xs md:text-sm px-4 md:px-6"
                  >
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar Dados Pessoais"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Dados da Empresa */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-[#1F2937] text-sm md:text-lg">
              <Building className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
              Dados da Empresa
            </CardTitle>
            <CardDescription className="text-[#6B7280] text-xs md:text-sm">
              Atualize as informações da sua imobiliária
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-6">
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-3 md:space-y-6">
                <FormField
                  control={companyForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs md:text-sm font-medium">
                        <Building className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                        Nome da Empresa
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da sua imobiliária" {...field} className="h-8 md:h-10 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateCompanyMutation.isPending}
                    className="bg-[#434be6] hover:bg-[#1D4ED8] h-8 md:h-10 text-xs md:text-sm px-4 md:px-6"
                  >
                    {updateCompanyMutation.isPending ? "Salvando..." : "Salvar Dados da Empresa"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Upload de Avatar */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-[#1F2937] text-sm md:text-lg">
              <Image className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
              Logotipo da Empresa
            </CardTitle>
            <CardDescription className="text-[#6B7280] text-xs md:text-sm">
              Faça upload do logotipo da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-6">
            <div className="space-y-3 md:space-y-4">
              {/* Área de upload ou preview */}
              {getCurrentImage() ? (
                <div className="relative">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 md:p-4 text-center bg-gray-50">
                    <img
                      src={getCurrentImage()!}
                      alt={hasNewImage() ? "Preview do novo logotipo" : "Seu logotipo atual"}
                      className="mx-auto max-h-20 md:max-h-32 max-w-full object-contain rounded-full"
                    />
                    {hasNewImage() ? (
                      <>
                        <p className="mt-2 text-xs md:text-sm text-gray-600">
                          {avatarFile?.name}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500">
                          {avatarFile && `${(avatarFile.size / (1024 * 1024)).toFixed(2)} MB`}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs md:text-sm text-gray-600">
                        Seu logotipo atual
                      </p>
                    )}
                  </div>
                  {hasNewImage() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                      className="absolute top-1 right-1 md:top-2 md:right-2 h-6 w-6 md:h-8 md:w-8 p-0"
                      title="Cancelar novo logotipo"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-8 text-center hover:border-[#434BE6] transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 md:h-12 md:w-12 text-gray-400" />
                  <p className="mt-2 text-xs md:text-sm text-gray-600">
                    Clique para selecionar seu logotipo
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500">
                    PNG ou JPEG até 5MB
                  </p>
                </div>
              )}
              
              {/* Input de arquivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Botões de ação */}
              {getCurrentImage() && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                  >
                    <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    {hasNewImage() ? "Alterar Logotipo" : "Editar Logotipo"}
                  </Button>
                  {hasNewImage() && (
                    <Button
                      onClick={handleAvatarUpload}
                      disabled={uploadAvatarMutation.isPending || uploadingAvatar}
                      className="flex-1 h-8 md:h-10 text-xs md:text-sm bg-[#434be6] hover:bg-[#1D4ED8]"
                    >
                      {(uploadAvatarMutation.isPending || uploadingAvatar) ? "Fazendo upload..." : "Salvar Novo Logotipo"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-[#1F2937] text-sm md:text-lg">
              <Lock className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
              Alterar Senha
            </CardTitle>
            <CardDescription className="text-[#6B7280] text-xs md:text-sm">
              Mantenha sua conta segura alterando sua senha regularmente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-6">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-3 md:space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm font-medium">Senha Atual</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="Digite sua senha atual" 
                            {...field} 
                            className="h-8 md:h-10 pr-8 md:pr-10 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-2 md:px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs md:text-sm font-medium">Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showNewPassword ? "text" : "password"} 
                              placeholder="Digite sua nova senha" 
                              {...field} 
                              className="h-8 md:h-10 pr-8 md:pr-10 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-2 md:px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs md:text-sm font-medium">Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="Confirme sua nova senha" 
                              {...field} 
                              className="h-8 md:h-10 pr-8 md:pr-10 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-2 md:px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="bg-[#434be6] hover:bg-[#1D4ED8] h-8 md:h-10 text-xs md:text-sm px-4 md:px-6"
                  >
                    {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}