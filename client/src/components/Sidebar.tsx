import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { 
  LayoutDashboard, 
  LineChart, 
  Users, 
  Building2, 
  Calculator, 
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  UserCog,
  CreditCard,
  Shield,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  PlayCircle,

} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface SidebarProps {}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  collapsed: boolean;
  isActive: boolean;
  isExternal?: boolean;
  actions?: Array<{
    title: string;
    href: string;
    icon: React.ReactNode;
  }>;
}

function SidebarItem({ icon, label, href, collapsed, isActive, isExternal = false, actions }: SidebarItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (isExternal) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative group">
      {isExternal ? (
        <div
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 mx-1 cursor-pointer",
            isActive ? 
              "bg-white/70 text-[#434BE6] shadow-sm border border-white/40" : 
              "text-slate-600 hover:bg-white/40 hover:text-slate-900",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {icon}
            </div>
            {!collapsed && <span className="truncate">{label}</span>}
          </div>
        </div>
      ) : (
        <Link href={href}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 mx-1",
              isActive ? 
                "bg-white/70 text-[#434BE6] shadow-sm border border-white/40" : 
                "text-slate-600 hover:bg-white/40 hover:text-slate-900",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {icon}
              </div>
              {!collapsed && <span className="truncate">{label}</span>}
            </div>
          </div>
        </Link>
      )}

      {/* Tooltip para modo colapsado */}
      {collapsed && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
          <div className="bg-slate-800 text-white text-sm px-3 py-2 rounded-xl whitespace-nowrap shadow-xl backdrop-blur-sm">
            {label}
          </div>
        </div>
      )}

      {/* Actions menu para modo expandido */}
      {actions && !collapsed && (
        <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
          <div className="bg-white/95 backdrop-blur-sm py-2 shadow-xl rounded-xl border border-slate-200/50 min-w-[160px]">
            {actions.map((action, idx) => (
              <Link key={idx} href={action.href}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  {action.icon}
                  <span>{action.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({}: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem("sidebar-collapsed");
      // Se não há estado salvo, o sidebar deve estar expandido por padrão
      // Se há estado salvo, usar o valor salvo
      return savedState !== null ? savedState === "true" : false;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed]);

  const mainNavItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Projeções",
      href: "/projections",
      icon: <LineChart className="h-5 w-5" />,
      actions: [
        {
          title: "Nova Projeção",
          href: "/projections/create",
          icon: <Plus className="h-4 w-4" />,
        }
      ]
    },
    {
      title: "Clientes",
      href: "/clients",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Imóveis",
      href: "/properties",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      title: "Calculadora Financeira",
      href: "/planilha",
      icon: <Calculator className="h-5 w-5" />,
    },
  ];

  const bottomNavItems = [
    {
      title: "Tutoriais",
      href: "/tutorials",
      icon: <PlayCircle className="h-5 w-5" />,
    },
    {
      title: "Suporte",
      href: "https://api.whatsapp.com/send/?phone=5554997111650",
      icon: <FaWhatsapp className="h-5 w-5" />,
      isExternal: true,
    },
    {
      title: "Configurações",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    ...(user?.isAdmin ? [{
      title: "Administração",
      href: "/admin",
      icon: <Shield className="h-5 w-5" />,
    }] : [])
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-white/98 backdrop-blur-sm border-r border-slate-200/40 shadow-lg transition-all duration-300 hidden md:flex flex-col fixed left-0 top-0 z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header com botão de colapsar */}
      <div className={cn("p-5 border-b border-slate-200/30", collapsed ? "px-2" : "px-5")}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center">
              <img 
                src="/assets/logo-full-400x100.png" 
                alt="ROImob" 
                className="h-12 w-auto"
              />
            </div>
          )}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-2 rounded-xl hover:bg-white/60 transition-all duration-200 text-slate-400 hover:text-slate-600 hover:shadow-sm",
              collapsed ? "mx-auto" : ""
            )}
          >
            {collapsed ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {collapsed && (
          <div className="mt-3 flex justify-center">
            <img 
              src="/assets/logo-icon.png" 
              alt="ROImob" 
              className="h-10 w-10"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.title}
              href={item.href}
              collapsed={collapsed}
              isActive={location === item.href}
              actions={item.actions}
            />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-200/30 px-2 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.title}
            href={item.href}
            collapsed={collapsed}
            isActive={location === item.href}
            isExternal={item.isExternal}
          />
        ))}
      </div>

      {/* User Profile */}
      <div className="border-t border-slate-200/30 p-4">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="relative group">
              <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-white/50 shadow-sm">
                <AvatarImage 
                  src={user?.photo ?? undefined} 
                  alt={user?.name || 'Usuário'} 
                />
                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xs font-medium">
                  {user?.name ? 
                    user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
                    'JS'}
                </AvatarFallback>
              </Avatar>
              
              {/* Tooltip do usuário no modo colapsado */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                <div className="bg-slate-800 text-white text-sm px-3 py-2 rounded-xl whitespace-nowrap shadow-xl backdrop-blur-sm">
                  {user?.name || 'João Silva'}
                  <div className="text-xs text-slate-300">{user?.company || 'Corretor'}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center justify-between cursor-pointer hover:bg-white/40 p-2 rounded-xl transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-9 w-9 ring-2 ring-white/50 shadow-sm">
                    <AvatarImage 
                      src={user?.photo ?? undefined} 
                      alt={user?.name || 'Usuário'} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xs font-medium">
                      {user?.name ? 
                        user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
                        'JS'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm text-left">
                    <div className="font-medium text-slate-900">{user?.name || 'João Silva'}</div>
                    <div className="text-xs text-slate-500">{user?.company || 'Corretor'}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border-slate-200/50">
              <DropdownMenuLabel className="text-slate-700">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-200/50" />
              <DropdownMenuGroup>
                <Link href="/settings?tab=profile">
                  <DropdownMenuItem className="text-slate-600 hover:bg-slate-50">
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings?tab=subscription">
                  <DropdownMenuItem className="text-slate-600 hover:bg-slate-50">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Assinatura</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem className="text-slate-600 hover:bg-slate-50">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-slate-200/50" />
              <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}