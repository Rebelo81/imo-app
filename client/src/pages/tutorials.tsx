
import { 
  Settings, 
  Building2, 
  Users, 
  FileText, 
  PlusCircle, 
  TrendingUp, 
  Share2, 
  Calculator 
} from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  icon: React.ReactNode;
  duration?: string;
}

const tutorials: Tutorial[] = [
  {
    id: "configuracoes-iniciais",
    title: "Configurações Iniciais",
    description: "Aprenda a configurar sua conta no Roimob e deixar tudo pronto para começar a criar projeções de investimento imobiliário com eficiência.",
    videoUrl: "https://www.youtube.com/embed/c7nyWLDxaJk",
    icon: <Settings className="h-5 w-5" />,
    duration: "5 min"
  },
  {
    id: "cadastrar-imoveis",
    title: "Cadastrar Imóveis",
    description: "Veja como cadastrar imóveis no sistema, preenchendo suas características e localização.",
    videoUrl: "https://www.youtube.com/embed/B6QvDmMBc-s",
    icon: <Building2 className="h-5 w-5" />,
    duration: "7 min"
  },
  {
    id: "cadastrar-clientes",
    title: "Cadastrar Clientes",
    description: "Aprenda a cadastrar seus clientes investidores e manter um histórico organizado com dados essenciais para gerar projeções personalizadas.",
    videoUrl: "https://www.youtube.com/embed/qoow0L6LIos",
    icon: <Users className="h-5 w-5" />,
    duration: "4 min"
  },
  {
    id: "pagina-projecoes",
    title: "Página de Projeções",
    description: "Conheça a área onde ficam todas as suas projeções salvas. Saiba como visualizar, editar, filtrar e gerenciar com facilidade.",
    videoUrl: "https://www.youtube.com/embed/jslu8Om9mLw",
    icon: <FileText className="h-5 w-5" />,
    duration: "6 min"
  },
  {
    id: "criar-nova-projecao",
    title: "Criar Nova Projeção",
    description: "Veja o passo a passo para gerar uma nova projeção de investimento, desde a seleção do imóvel até os cálculos de rentabilidade.",
    videoUrl: "https://www.youtube.com/embed/Fc4l6Vhq3mU",
    icon: <PlusCircle className="h-5 w-5" />,
    duration: "12 min"
  },
  {
    id: "entendendo-projecao",
    title: "Entendendo a Projeção",
    description: "Entenda como interpretar os dados da projeção gerada: fluxo de pagamento, INCC, ROI, TIR e mais, para apresentar com segurança ao investidor.",
    videoUrl: "https://www.youtube.com/embed/B6VS6apapGs",
    icon: <TrendingUp className="h-5 w-5" />,
    duration: "15 min"
  },
  {
    id: "compartilhar-projecao",
    title: "Compartilhar a Projeção",
    description: "Aprenda como gerar um link público da projeção para enviar ao cliente e apresentar as condições de investimento de forma clara e profissional.",
    videoUrl: "https://www.youtube.com/embed/7bmzGXN-z2M",
    icon: <Share2 className="h-5 w-5" />,
    duration: "8 min"
  },
  {
    id: "calculadora-financeira",
    title: "Calculadora Financeira",
    description: "Use a calculadora integrada do Roimob para simular parcelas, correções e condições comerciais de forma rápida e prática.",
    videoUrl: "https://www.youtube.com/embed/jX4ZUqQ3YEA",
    icon: <Calculator className="h-5 w-5" />,
    duration: "10 min"
  }
];

export default function Tutorials() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Central de Tutoriais
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl">Assista aos tutoriais para aproveitar ao máximo todas as funcionalidades da plataforma.</p>
      </div>
      {/* Tutorials Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {tutorials.map((tutorial) => (
          <div key={tutorial.id} className="space-y-4 h-fit">
            {/* Title with Icon */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                {tutorial.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {tutorial.title}
              </h3>
            </div>
            
            {/* Description */}
            <p className="text-gray-600 leading-relaxed min-h-[3rem]">
              {tutorial.description}
            </p>
            
            {/* YouTube Video Embed */}
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 max-h-48">
              <iframe
                src={tutorial.videoUrl}
                title={tutorial.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        ))}
      </div>
      {/* Footer Help */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Precisa de mais ajuda?
        </h3>
        <p className="text-gray-600">
          Caso tenha dúvidas específicas não cobertas nos tutoriais, acesse o menu "Suporte" no menu lateral para entrar em contato conosco.
        </p>
      </div>
    </div>
  );
}