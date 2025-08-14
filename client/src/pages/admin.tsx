import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Activity, 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Shield, 
  Calendar,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Webhook,
  Database,
  Monitor,
  LogIn,
  UserPlus,
  Key
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  subscriptionsEndingSoon: number;
  usersOnlineNow: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  company: string | null;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  subscriptionCanceledAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  projectionCount: number;
}

interface WebhookLog {
  id: number;
  type: string;
  status: string;
  customerId: string | null;
  subscriptionId: string | null;
  data: any;
  errorMessage: string | null;
  receivedAt: Date;
}

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // User filters state
  const [userFilters, setUserFilters] = useState({
    search: "",
    subscriptionStatus: "all",
    adminStatus: "all",
    activityStatus: "all"
  });

  // Reset password state
  const [resetPasswordData, setResetPasswordData] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
    newPassword: string;
  }>({
    isOpen: false,
    userId: null,
    userName: "",
    newPassword: ""
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch webhook logs
  const { data: webhookLogs, isLoading: webhookLoading } = useQuery<WebhookLog[]>({
    queryKey: ["/api/admin/webhook-logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter users based on current filters
  const filteredUsers = users?.filter(user => {
    // Search filter
    if (userFilters.search && !user.name.toLowerCase().includes(userFilters.search.toLowerCase()) && 
        !user.email.toLowerCase().includes(userFilters.search.toLowerCase())) {
      return false;
    }

    // Subscription status filter
    if (userFilters.subscriptionStatus !== "all") {
      if (userFilters.subscriptionStatus === "active" && user.subscriptionStatus !== "active") return false;
      if (userFilters.subscriptionStatus === "canceled" && user.subscriptionStatus !== "canceled") return false;
      if (userFilters.subscriptionStatus === "none" && user.subscriptionStatus) return false;
    }

    // Admin status filter
    if (userFilters.adminStatus !== "all") {
      if (userFilters.adminStatus === "admin" && !user.isAdmin) return false;
      if (userFilters.adminStatus === "user" && user.isAdmin) return false;
    }

    // Activity status filter
    if (userFilters.activityStatus !== "all") {
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
      const isOnline = user.lastActiveAt && new Date(user.lastActiveAt) >= tenMinutesAgo;
      
      if (userFilters.activityStatus === "online" && !isOnline) return false;
      if (userFilters.activityStatus === "offline" && isOnline) return false;
    }

    return true;
  }) || [];

  // Mutation to update user
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Usuário atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Mutation for admin auto-login
  const autoLoginMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/admin/auto-login-token/${userId}`);
    },
    onSuccess: (data) => {
      // Show instructions to open in incognito mode
      const loginUrl = `${window.location.origin}/auth/auto-login?token=${data.token}`;
      
      toast({
        title: "Token gerado com sucesso",
        description: `Para acessar como ${data.userName} sem deslogar do admin: 1) Copie o link abaixo 2) Abra uma aba anônima/privada 3) Cole o link na aba anônima`,
      });

      // Copy URL to clipboard
      navigator.clipboard.writeText(loginUrl).then(() => {
        toast({
          title: "Link copiado!",
          description: "O link foi copiado para sua área de transferência. Abra uma aba anônima e cole o link.",
        });
      }).catch(() => {
        // Fallback: show URL in alert for manual copy
        alert(`Link para login anônimo:\n\n${loginUrl}\n\nAbra uma aba anônima/privada e cole este link para acessar como ${data.userName} sem deslogar do admin.`);
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login automático",
        description: error.message || "Não foi possível realizar o login automático.",
        variant: "destructive",
      });
    },
  });

  // Mutation for reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      return apiRequest("POST", "/api/admin/reset-user-password", { userId, newPassword });
    },
    onSuccess: (data) => {
      setResetPasswordData({
        isOpen: false,
        userId: null,
        userName: "",
        newPassword: ""
      });
      toast({
        title: "Senha redefinida com sucesso",
        description: `A senha do usuário ${data.userEmail} foi alterada com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Não foi possível redefinir a senha.",
        variant: "destructive",
      });
    },
  });

  // Function to open reset password dialog
  const openResetPasswordDialog = (user: AdminUser) => {
    setResetPasswordData({
      isOpen: true,
      userId: user.id,
      userName: user.name,
      newPassword: ""
    });
  };

  // Function to handle reset password submit
  const handleResetPassword = () => {
    if (!resetPasswordData.userId || !resetPasswordData.newPassword) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: resetPasswordData.userId,
      newPassword: resetPasswordData.newPassword
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Nunca";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("pt-BR");
  };

  const getSubscriptionStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Sem assinatura</Badge>;
    
    const statusConfig = {
      active: { variant: "default" as const, label: "Ativa" },
      canceled: { variant: "destructive" as const, label: "Cancelada" },
      cancel_at_period_end: { variant: "secondary" as const, label: "Cancelando" },
      trialing: { variant: "outline" as const, label: "Teste" },
      incomplete: { variant: "destructive" as const, label: "Incompleta" },
      unpaid: { variant: "destructive" as const, label: "Não paga" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getOnlineStatus = (lastActiveAt: Date | null) => {
    if (!lastActiveAt) return { status: "offline", label: "Nunca ativo", color: "text-gray-500" };
    
    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 10) {
      return { status: "online", label: "Online agora", color: "text-green-600" };
    } else if (diffMinutes <= 60) {
      return { status: "recent", label: `${diffMinutes}min atrás`, color: "text-yellow-600" };
    } else if (diffMinutes <= 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return { status: "today", label: `${hours}h atrás`, color: "text-orange-600" };
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return { status: "offline", label: `${days}d atrás`, color: "text-gray-500" };
    }
  };

  if (usersError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Acesso negado. Apenas administradores podem acessar esta área.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie usuários, assinaturas e monitore o sistema
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            Atualização automática ativa
          </div>
        </div>

        {/* Overview Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.canceledSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expirando em 7 dias</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.subscriptionsEndingSoon}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Agora</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.usersOnlineNow}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Logs Stripe
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Status das Assinaturas
                  </CardTitle>
                  <CardDescription>
                    Distribuição atual dos status de assinatura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </div>
                  ) : stats ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Ativas</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${(stats.activeSubscriptions / stats.totalUsers) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{stats.activeSubscriptions}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Canceladas</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-red-600 h-2 rounded-full" 
                              style={{ width: `${(stats.canceledSubscriptions / stats.totalUsers) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{stats.canceledSubscriptions}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Sem assinatura</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-gray-400 h-2 rounded-full" 
                              style={{ width: `${((stats.totalUsers - stats.activeSubscriptions - stats.canceledSubscriptions) / stats.totalUsers) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {stats.totalUsers - stats.activeSubscriptions - stats.canceledSubscriptions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Atividade dos Usuários
                  </CardTitle>
                  <CardDescription>
                    Status de atividade recente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </div>
                  ) : stats ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Online agora (10min)
                        </span>
                        <span className="text-sm font-medium">{stats.usersOnlineNow}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          Ativos hoje
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          Inativos
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciamento de Usuários
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* User Filters */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={userFilters.search}
                        onChange={(e) => setUserFilters(prev => ({...prev, search: e.target.value}))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Select 
                        value={userFilters.subscriptionStatus} 
                        onValueChange={(value) => setUserFilters(prev => ({...prev, subscriptionStatus: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status da Assinatura" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="canceled">Cancelado</SelectItem>
                          <SelectItem value="none">Sem Assinatura</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select 
                        value={userFilters.adminStatus} 
                        onValueChange={(value) => setUserFilters(prev => ({...prev, adminStatus: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de Usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="admin">Administradores</SelectItem>
                          <SelectItem value="user">Usuários</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select 
                        value={userFilters.activityStatus} 
                        onValueChange={(value) => setUserFilters(prev => ({...prev, activityStatus: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status de Atividade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Filter Results Count and Clear Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Exibindo {filteredUsers.length} de {users?.length || 0} usuários
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setUserFilters({
                        search: "",
                        subscriptionStatus: "all",
                        adminStatus: "all",
                        activityStatus: "all"
                      })}
                      className="text-xs"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                          <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Assinatura</TableHead>
                          <TableHead>Projeções</TableHead>
                          <TableHead>Status Online</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => {
                          const onlineStatus = getOnlineStatus(user.lastActiveAt);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                  {user.company && (
                                    <div className="text-xs text-muted-foreground">{user.company}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {getSubscriptionStatusBadge(user.subscriptionStatus)}
                                  {user.subscriptionCurrentPeriodEnd && (
                                    <div className="text-xs text-muted-foreground">
                                      Expira: {formatDate(user.subscriptionCurrentPeriodEnd)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.projectionCount}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`text-sm ${onlineStatus.color}`}>
                                  {onlineStatus.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={user.isAdmin}
                                  onCheckedChange={(checked) => {
                                    updateUserMutation.mutate({
                                      userId: user.id,
                                      data: { isAdmin: checked },
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => autoLoginMutation.mutate(user.id)}
                                          disabled={autoLoginMutation.isPending}
                                          className="bg-primary hover:bg-primary/90"
                                        >
                                          <UserPlus className="h-4 w-4" />
                                          {autoLoginMutation.isPending ? "..." : "Gerar Link"}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Gera link para login anônimo - abra em aba privada para não deslogar do admin</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openResetPasswordDialog(user)}
                                        >
                                          <Key className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Redefinir senha do usuário</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Editar Usuário</DialogTitle>
                                      <DialogDescription>
                                        Gerencie as configurações do usuário {user.name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">Status da Assinatura</label>
                                        <Select
                                          value={user.subscriptionStatus || ""}
                                          onValueChange={(value) => {
                                            updateUserMutation.mutate({
                                              userId: user.id,
                                              data: { subscriptionStatus: value },
                                            });
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="active">Ativa</SelectItem>
                                            <SelectItem value="canceled">Cancelada</SelectItem>
                                            <SelectItem value="cancel_at_period_end">Cancelando</SelectItem>
                                            <SelectItem value="trialing">Teste</SelectItem>
                                            <SelectItem value="incomplete">Incompleta</SelectItem>
                                            <SelectItem value="unpaid">Não paga</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">Permissões de Administrador</label>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={user.isAdmin}
                                            onCheckedChange={(checked) => {
                                              updateUserMutation.mutate({
                                                userId: user.id,
                                                data: { isAdmin: checked },
                                              });
                                            }}
                                          />
                                          <label className="text-sm">Administrador</label>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">Informações</label>
                                        <div className="text-sm space-y-1">
                                          <div>ID: {user.id}</div>
                                          <div>Criado em: {formatDate(user.createdAt)}</div>
                                          <div>Último acesso: {formatDate(user.lastActiveAt)}</div>
                                          <div>Projeções criadas: {user.projectionCount}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Logs de Webhook Stripe
                </CardTitle>
                <CardDescription>
                  Monitore eventos e logs de webhook do Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webhookLoading ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                        <div className="h-4 bg-muted animate-pulse rounded flex-1" />
                        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : webhookLogs && webhookLogs.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cliente/Assinatura</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {webhookLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge variant="outline">{log.type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={log.status === "success" ? "default" : "destructive"}
                                >
                                  {log.status === "success" ? "Sucesso" : "Erro"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {log.relatedClient ? (
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-blue-600">
                                        {log.relatedClient.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {log.relatedClient.email}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        ID: {log.relatedClient.id}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {log.customerId && (
                                        <div className="text-xs text-muted-foreground">
                                          Customer: {log.customerId.substring(0, 20)}...
                                        </div>
                                      )}
                                      {log.subscriptionId && (
                                        <div className="text-xs text-muted-foreground">
                                          Sub: {log.subscriptionId.substring(0, 20)}...
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDate(log.receivedAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Database className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do Webhook</DialogTitle>
                                      <DialogDescription>
                                        Informações completas do evento {log.type}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-[400px]">
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-medium">Informações Básicas</h4>
                                          <div className="text-sm space-y-1 mt-2">
                                            <div>ID: {log.id}</div>
                                            <div>Tipo: {log.type}</div>
                                            <div>Status: {log.status}</div>
                                            <div>Recebido em: {formatDate(log.receivedAt)}</div>
                                          </div>
                                        </div>

                                        {log.relatedClient && (
                                          <div>
                                            <h4 className="font-medium text-blue-600">Cliente Relacionado</h4>
                                            <div className="text-sm space-y-1 mt-2 p-3 bg-blue-50 rounded">
                                              <div><strong>Nome:</strong> {log.relatedClient.name}</div>
                                              <div><strong>Email:</strong> {log.relatedClient.email}</div>
                                              <div><strong>ID do Usuário:</strong> {log.relatedClient.id}</div>
                                            </div>
                                          </div>
                                        )}

                                        {(log.customerId || log.subscriptionId) && (
                                          <div>
                                            <h4 className="font-medium">Identificadores Stripe</h4>
                                            <div className="text-sm space-y-1 mt-2">
                                              {log.customerId && (
                                                <div><strong>Customer ID:</strong> <code className="text-xs bg-muted px-1 rounded">{log.customerId}</code></div>
                                              )}
                                              {log.subscriptionId && (
                                                <div><strong>Subscription ID:</strong> <code className="text-xs bg-muted px-1 rounded">{log.subscriptionId}</code></div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {log.errorMessage && (
                                          <div>
                                            <h4 className="font-medium text-red-600">Erro</h4>
                                            <div className="text-sm mt-2 p-2 bg-red-50 rounded">
                                              {log.errorMessage}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div>
                                          <h4 className="font-medium">Dados do Webhook</h4>
                                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                                            {JSON.stringify(log.data, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum log de webhook encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordData.isOpen} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordData({
            isOpen: false,
            userId: null,
            userName: "",
            newPassword: ""
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Redefinir Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o usuário <strong>{resetPasswordData.userName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleResetPassword();
                  }
                }}
              />
              <div className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setResetPasswordData({
                  isOpen: false,
                  userId: null,
                  userName: "",
                  newPassword: ""
                })}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || !resetPasswordData.newPassword}
                className="bg-primary hover:bg-primary/90"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Redefinir Senha
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;