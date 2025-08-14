import { useAuth } from "./AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, Plus, LogOut, Settings, User, CreditCard, Building, HelpCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  LineChart, 
  Users, 
  Building2, 
  Calculator,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Projeções",
      href: "/projections",
      icon: <LineChart className="h-5 w-5" />,
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
      title: "Calculadora",
      href: "/planilha",
      icon: <Calculator className="h-5 w-5" />,
    },
    {
      title: "Tutoriais",
      href: "/tutorials",
      icon: <PlayCircle className="h-5 w-5" />,
    },
    {
      title: "Configurações",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    }
  ];

  return (
    <>
      <header className="bg-white/98 backdrop-blur-sm border-b border-slate-200/40 shadow-sm py-3 px-6 md:px-8 flex items-center z-10">
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-500 mr-4"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Spacer */}
        <div className="flex-1"></div>
        
        {/* Action buttons and user profile */}
        <div className="flex items-center gap-3">

          {/* User profile dropdown */}
          {isLoading ? (
            <div className="flex items-center">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 border border-gray-200">
                      <AvatarImage 
                        src={user.photo} 
                        alt={user.name}
                      />
                      <AvatarFallback className="bg-gray-100 text-[#6B7280] text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-[#6B7280] mt-1">{user.company}</p>
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-[#6B7280]">{user.company}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <Link href="/settings?tab=profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/settings?tab=subscription">
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Assinatura</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white h-full w-64 p-4 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center">
                <img 
                  src="/assets/logo-full-400x100.png" 
                  alt="ROImob" 
                  className="h-9 w-auto"
                />
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#6B7280] hover:text-gray-700"  
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 mb-6">
              {user && (
                <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {user.photo ? (
                      <img 
                        src={user.photo} 
                        alt={user.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <span className="text-[#6B7280] font-medium text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-xs text-[#6B7280]">{user.company}</div>
                  </div>
                </div>
              )}
            </div>

            <nav className="flex-1">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm gap-3 transition-colors",
                        location === item.href 
                          ? "bg-gray-100 text-[#434BE6] font-medium" 
                          : "text-[#6B7280] hover:bg-gray-50 hover:text-gray-900"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Seção de Suporte na parte inferior */}
            <div className="border-t border-gray-200 pt-4">
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://api.whatsapp.com/send/?phone=5554997111650', '_blank', 'noopener,noreferrer');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center rounded-md px-3 py-2 text-sm gap-3 transition-colors text-[#6B7280] hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              >
                <FaWhatsapp className="h-5 w-5" />
                <span>Suporte</span>
              </div>
            </div>

            
          </div>
        </div>
      )}
    </>
  );
}
