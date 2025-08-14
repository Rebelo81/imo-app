import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import WelcomeModal from "./WelcomeModal";
import { useAuth } from "./AuthProvider";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Use authenticated user data
  const { user, isLoading } = useAuth();

  // State for welcome modal
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Sincronizar o estado da sidebar com localStorage para ajustar o layout
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        setSidebarCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
      }
    };

    // Escutar mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Verificar o estado inicial
    handleStorageChange();

    // Polling para detectar mudanças locais (quando o componente Sidebar altera o localStorage)
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Effect to check if welcome modal should be shown
  useEffect(() => {
    if (user && !isLoading) {
      // Show welcome modal if user hasn't seen it yet
      if (!user.hasSeenWelcomeModal) {
        setShowWelcomeModal(true);
      }
    }
  }, [user, isLoading]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 relative overflow-hidden ${
          sidebarCollapsed 
            ? 'ml-0 md:ml-16 print:ml-0' // No margin on mobile, 4rem on desktop when collapsed, no margin on print
            : 'ml-0 md:ml-64 print:ml-0' // No margin on mobile, 16rem on desktop when expanded, no margin on print
        }`}
      >
        {/* Header */}
        <div className="print:hidden">
          <Header />
        </div>

        {/* Main Content Area with scroll */}
        <main
          data-scroll-container
          className="flex-1 overflow-y-auto overflow-x-hidden pb-8 px-6 md:px-8 bg-white/85 backdrop-blur-sm"
        >
          {children}
        </main>
      </div>

      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={() => setShowWelcomeModal(false)} 
      />
    </div>
  );
}