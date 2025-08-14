import { motion } from "framer-motion";
import { ArrowRight, Calculator, TrendingUp, BarChart3, Shield, Users, CheckCircle, Star, ArrowDown, Play, X, Check, Monitor, Smartphone, MapPin, Clock, Building, Eye, CreditCard, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { LazyVideo } from "@/components/LazyVideo";
import { LazyImage } from "@/components/LazyImage";

const LandingPage = () => {
  const [countUp, setCountUp] = useState({ corretores: 0, projecoes: 0, estados: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Add timeout fallback for deployment environments
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!videoLoaded) {
        console.log('Video timeout - showing fallback for deployment compatibility');
        setVideoError(true);
      }
    }, 5000); // 5 second timeout for MP4 loading

    return () => clearTimeout(timer);
  }, [videoLoaded]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Animate counters when section comes into view
  const animateCounters = () => {
    if (hasAnimated) return;
    setHasAnimated(true);
    
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setCountUp({
        corretores: Math.floor(120 * progress),
        projecoes: Math.floor(2300 * progress),
        estados: Math.floor(8 * progress)
      });
      
      if (currentStep >= steps) {
        clearInterval(interval);
        setCountUp({ corretores: 120, projecoes: 2300, estados: 8 });
      }
    }, stepDuration);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <div className="flex items-center">
              <img 
                src="/assets/logo-full-400x100.png" 
                alt="ROImob" 
                className="h-8 sm:h-12 w-auto"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                onClick={() => scrollToSection('pricing')}
                className="bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] hover:from-[#3A42D4] hover:via-[#5B4BF0] hover:to-[#7355F0] text-white px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="block sm:hidden">Começar</span>
                <span className="hidden sm:block">Começar Agora</span>
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-[#6366F1] hover:bg-gradient-to-r hover:from-[#6366F1]/10 hover:to-[#8B5CF6]/10 transition-all duration-300 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                onClick={() => window.location.href = '/auth/login'}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </motion.header>
      {/* Hero Section - Modern Minimalist Design */}
      <section className="relative pt-20 sm:pt-32 pb-12 sm:pb-24 px-2 sm:px-4 lg:px-8 overflow-hidden">
        {/* Background Gradient - Enhanced Blue to Purple Theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/10 via-[#6B5BF4]/8 to-[#7D5FF4]/10"></div>
        
        {/* Enhanced Floating Elements - Emphasized Blue to Purple Palette */}
        <div className="absolute top-8 sm:top-16 left-4 sm:left-8 w-24 sm:w-48 h-24 sm:h-48 bg-gradient-to-br from-[#434BE6]/20 via-[#6B5BF4]/15 to-[#7D5FF4]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-8 sm:bottom-16 right-4 sm:right-8 w-32 sm:w-56 h-32 sm:h-56 bg-gradient-to-tl from-[#7D5FF4]/20 via-[#6B5BF4]/15 to-[#434BE6]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 sm:w-32 h-16 sm:h-32 bg-gradient-to-r from-[#6B5BF4]/15 to-[#7D5FF4]/15 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '2s', animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-20 sm:w-40 h-20 sm:h-40 bg-gradient-to-bl from-[#434BE6]/12 to-[#7D5FF4]/12 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            {/* Left Side - Headline Content (1/2 width) */}
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="space-y-4 sm:space-y-6 text-center lg:text-left"
            >
              {/* Headline - Proportional Size */}
              <motion.h1 
                variants={fadeInUp}
                className="text-2xl sm:text-3xl lg:text-5xl font-bold leading-tight"
              >
                <motion.span 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent bg-[length:200%_100%] text-[22px] sm:text-[32px] lg:text-[44px]"
                >
                  Calcule o retorno real de um
                </motion.span>
                <br />
                <motion.span 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ 
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 0.5
                  }}
                  className="bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] bg-clip-text text-transparent bg-[length:200%_100%] text-[22px] sm:text-[32px] lg:text-[44px]"
                >
                  investimento imobiliário
                </motion.span>
                <br />
                <motion.span 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 1
                  }}
                  className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent bg-[length:200%_100%] text-[22px] sm:text-[32px] lg:text-[44px]"
                >
                  em menos de 5 minutos
                </motion.span>
              </motion.h1>
              
              {/* Subtitle */}
              <motion.p 
                variants={fadeInUp}
                className="text-sm sm:text-lg lg:text-xl bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600 bg-clip-text text-transparent font-semibold"
              >Crie projeções imobiliárias em poucos cliques, e impressione seu cliente investidor com relatórios profissionais e completos</motion.p>
              
              {/* Action Buttons - Desktop Only */}
              <motion.div 
                variants={fadeInUp}
                className="hidden lg:flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4"
              >
                <Button 
                  onClick={() => scrollToSection('pricing')}
                  className="group bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] hover:from-[#3A42D4] hover:via-[#5B4BF0] hover:to-[#7355F0] text-white px-6 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
                >
                  Começar Agora 
                  <ArrowRight className="ml-2 sm:ml-3 h-4 sm:h-5 w-4 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => scrollToSection('video-demo')}
                  className="border-2 border-[#434BE6]/30 text-[#434BE6] hover:bg-gradient-to-r hover:from-[#434BE6] hover:to-[#5B63F5] hover:text-white hover:border-transparent px-6 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-semibold backdrop-blur-sm bg-white/50 hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  Ver Como Funciona
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Side - Modern Video Container (1/2 width - Emphasized) */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative mt-8 lg:mt-0"
            >
              {/* Enhanced Animated Background Effects */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ 
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="w-[120%] h-[120%] bg-gradient-to-br from-[#434BE6]/30 via-[#6B5BF4]/25 to-[#7D5FF4]/30 rounded-full blur-3xl opacity-80"
                />
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1.15, 1, 1.15],
                    rotate: [360, 180, 0],
                  }}
                  transition={{ 
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="w-[100%] h-[100%] bg-gradient-to-tl from-[#7D5FF4]/25 via-[#6B5BF4]/20 to-[#434BE6]/30 rounded-full blur-2xl opacity-70"
                />
              </div>
              
              {/* Emphasized Video Container - Larger and More Prominent */}
              <div className="relative z-10 scale-100 sm:scale-110">
                <motion.div 
                  animate={{ 
                    y: [0, -8, 0],
                    rotateX: [0, 1, 0],
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-2xl p-0.5 shadow-3xl"
                >
                  {/* Subtle Glowing Border Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] rounded-2xl opacity-40 blur-sm"></div>
                  
                  {/* Video Container - Reduced Borders */}
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                    <video
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className={`w-full h-full object-cover rounded-2xl ${videoError ? 'hidden' : ''}`}
                      onLoadStart={() => {
                        console.log('Video load started');
                        setVideoError(false);
                      }}
                      onCanPlay={() => {
                        console.log('Video can play');
                        setVideoLoaded(true);
                        setVideoError(false);
                      }}
                      onError={() => {
                        console.log('Video load error - showing fallback');
                        setVideoError(true);
                        setVideoLoaded(false);
                      }}
                    >
                      <source src="/assets/headline-demo.mp4" type="video/mp4" />
                      <source src="/assets/headline-demo.mov" type="video/quicktime" />
                    </video>
                    
                    {/* Enhanced Fallback content - Show when video fails */}
                    <div className={`absolute inset-0 ${videoError || !videoLoaded ? 'flex' : 'hidden'} items-center justify-center h-full bg-gradient-to-br from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] rounded-2xl`}>
                      <div className="text-center text-white px-4">
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 360],
                            borderRadius: ["20%", "50%", "20%"]
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="w-16 sm:w-28 h-16 sm:h-28 mx-auto mb-4 sm:mb-6 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/30"
                        >
                          <BarChart3 className="h-8 sm:h-14 w-8 sm:w-14 text-white" />
                        </motion.div>
                        <motion.h3 
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="font-bold text-lg sm:text-2xl mb-2 sm:mb-3"
                        >
                          ROImob Platform
                        </motion.h3>
                        <p className="text-white/80 text-sm sm:text-base">Simulação de Investimentos</p>
                        <div className="mt-4 sm:mt-6 flex justify-center space-x-2">
                          {[0, 0.2, 0.4].map((delay, i) => (
                            <motion.div 
                              key={i}
                              animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.6, 1, 0.6]
                              }}
                              transition={{ 
                                duration: 1.5,
                                repeat: Infinity,
                                delay: delay
                              }}
                              className="w-2 sm:w-3 h-2 sm:h-3 bg-white/80 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Recording Indicator - Simple Dot */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"
                    />
                    
                    {/* Enhanced Floating Particles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -120, 0],
                          x: [0, Math.sin(i) * 60, 0],
                          opacity: [0, 0.8, 0],
                          scale: [0, 1.2, 0]
                        }}
                        transition={{
                          duration: 5 + i,
                          repeat: Infinity,
                          delay: i * 0.4,
                          ease: "easeInOut"
                        }}
                        className="absolute w-2.5 h-2.5 bg-white/40 rounded-full"
                        style={{
                          top: `${15 + i * 8}%`,
                          left: `${8 + i * 12}%`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
              
              {/* Enhanced Floating Geometric Elements */}
              <motion.div 
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 12,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -top-10 -left-10 w-20 h-20 bg-gradient-to-br from-[#434BE6] to-[#5B63F5] opacity-25 blur-lg"
                style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
              />
              <motion.div 
                animate={{ 
                  rotate: [360, 0],
                  y: [0, -25, 0]
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -bottom-14 -right-14 w-28 h-28 bg-gradient-to-tl from-[#7B83FF] to-[#5B63F5] rounded-full opacity-20 blur-xl"
              />
              <motion.div 
                animate={{ 
                  x: [0, 25, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute top-1/2 -left-8 w-16 h-16 bg-gradient-to-r from-[#5B63F5] to-[#434BE6] opacity-30 blur-md"
                style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}
              />
            </motion.div>
          </div>
          
          {/* Mobile Action Buttons - Below Video */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="lg:hidden flex flex-col gap-3 pt-8 px-4 sm:px-8"
          >
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <Button 
                onClick={() => scrollToSection('pricing')}
                className="group bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] hover:from-[#3A42D4] hover:via-[#5B4BF0] hover:to-[#7355F0] text-white px-6 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
              >
                Começar Agora 
                <ArrowRight className="ml-2 sm:ml-3 h-4 sm:h-5 w-4 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => scrollToSection('video-demo')}
                className="border-2 border-[#434BE6]/30 text-[#434BE6] hover:bg-gradient-to-r hover:from-[#434BE6] hover:to-[#5B63F5] hover:text-white hover:border-transparent px-6 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg font-semibold backdrop-blur-sm bg-white/50 hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Ver Como Funciona
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Problem Section */}
      <section id="problem" className="relative py-20 overflow-hidden bg-gradient-to-br from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4]">
        {/* Enhanced Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 -right-16 w-48 h-48 bg-white/3 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute bottom-1/3 left-1/5 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-28 h-28 bg-white/4 rounded-full blur-2xl animate-bounce delay-500"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 bg-white/6 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-8 sm:mb-12"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl text-white font-semibold mt-2 sm:mt-[10px] mb-2 sm:mb-[10px] px-2"
            >
              A ausência de projeções e dados claros, faz muitos{" "}
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent font-extrabold">
                corretores perderem oportunidades valiosas.
              </span>
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-white/85 max-w-4xl mx-auto text-sm sm:text-base lg:text-[18px] px-2"
            >
              Investidores precisam de números concretos e projeções profissionais para tomar decisões seguras
            </motion.p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
          >
            {[
              {
                icon: <TrendingUp className="h-7 w-7" />,
                title: "Valorização sem comprovação",
                description: "O corretor menciona o potencial do imóvel, mas não comprova o retorno real para o investidor",
                gradient: "from-red-400 to-orange-500"
              },
              {
                icon: <Calculator className="h-7 w-7" />,
                title: "Correções ignoradas",
                description: "Não mostra o custo real com correções monetárias que impactam diretamente o retorno sobre o investimento",
                gradient: "from-orange-400 to-yellow-500"
              },
              {
                icon: <BarChart3 className="h-7 w-7" />,
                title: "Apresentação simples",
                description: "Propostas enviadas de forma simples e desorganizada, sem o profissionalismo que investidor espera",
                gradient: "from-yellow-400 to-green-500"
              },
              {
                icon: <Shield className="h-7 w-7" />,
                title: "Falta de credibilidade",
                description: "Sem dados e números claros, o investidor pode perder o interesse no investimento",
                gradient: "from-green-400 to-blue-500"
              }
            ].map((problem, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="relative group h-full">
                  {/* Modern elevated card with light background */}
                  <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-center border border-white/30 shadow-2xl hover:shadow-3xl hover:bg-white transition-all duration-700 hover:scale-[1.02] h-full group-hover:-translate-y-2">
                    {/* Gradient accent border */}
                    <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${problem.gradient} p-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
                      <div className="bg-white rounded-2xl sm:rounded-3xl h-full w-full"></div>
                    </div>
                    
                    <div className="relative z-10">
                      {/* Icon container with gradient */}
                      <div className="flex justify-center mb-2 sm:mb-4">
                        <div className={`w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br ${problem.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                          <div className="text-white">
                            <div className="h-5 w-5 sm:h-7 sm:w-7">
                              {problem.icon}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Title with gradient text */}
                      <h3 className={`font-bold text-sm sm:text-lg mb-2 sm:mb-3 bg-gradient-to-r ${problem.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                        {problem.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                        {problem.description}
                      </p>
                    </div>
                    
                    {/* Subtle floating elements */}
                    <div className={`absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-4 sm:w-6 h-4 sm:h-6 bg-gradient-to-br ${problem.gradient} rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 blur-sm`}></div>
                    <div className={`absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 w-3 sm:w-4 h-3 sm:h-4 bg-gradient-to-tr ${problem.gradient} rounded-full opacity-15 group-hover:opacity-30 transition-opacity duration-300 blur-sm`}></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Solution Section - Modern Floating Design */}
      <section id="solution" className="relative py-12 sm:py-20 overflow-hidden">
        {/* Modern Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
          <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/5 via-[#6B5BF4]/3 to-[#7D5FF4]/5"></div>
        </div>

        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-10 sm:-top-20 -left-10 sm:-left-20 w-16 sm:w-32 h-16 sm:h-32 bg-gradient-to-br from-[#434BE6] to-[#6B5BF4] opacity-15 blur-2xl rounded-full"
          />
          <motion.div 
            animate={{ 
              rotate: [360, 0],
              y: [0, -40, 0]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 -right-8 sm:-right-16 w-12 sm:w-24 h-12 sm:h-24 bg-gradient-to-tl from-[#7D5FF4] to-[#6B5BF4] opacity-20 blur-xl"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
          />
          <motion.div 
            animate={{ 
              x: [0, 30, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 18,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 -left-6 sm:-left-12 w-10 sm:w-20 h-10 sm:h-20 bg-gradient-to-r from-[#6B5BF4] to-[#434BE6] opacity-25 blur-lg"
            style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-3/4 right-1/4 w-8 sm:w-16 h-8 sm:h-16 bg-gradient-to-br from-[#7D5FF4] to-[#434BE6] rounded-full blur-md"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          {/* Floating Header Section */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12 sm:mb-20"
          >
            <motion.div
              variants={{
                initial: { opacity: 0, y: 50 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8 }}
              className="relative inline-block"
            >
              <motion.h2 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-8 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] bg-clip-text text-transparent px-2"
                style={{
                  backgroundSize: '200% 200%',
                  filter: 'drop-shadow(0 4px 8px rgba(67, 75, 230, 0.15))'
                }}
              >
                A solução completa que{" "}
                <motion.span 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="bg-gradient-to-r from-[#7D5FF4] via-[#434BE6] to-[#6B5BF4] bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  fecha negócios
                </motion.span>
              </motion.h2>
              
              {/* Floating accent around title */}
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -inset-8 bg-gradient-to-r from-[#434BE6]/10 to-[#7D5FF4]/10 rounded-full blur-xl -z-10"
              />
            </motion.div>
            
            <motion.div
              variants={{
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <motion.p 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-lg sm:text-xl lg:text-2xl max-w-4xl mx-auto bg-gradient-to-r from-gray-700 via-[#434BE6] to-gray-700 bg-clip-text text-[#374151] font-semibold px-2"
                style={{ backgroundSize: '200% 200%' }}
              >Em menos de 5 minutos, você entrega projeções completas, personalizadas e prontas para enviar ao cliente.</motion.p>
            </motion.div>
          </motion.div>

          {/* How It Works Step-by-Step Flow */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="sm:mb-20 mt-[0px] mb-[0px]"
          >
            {/* Step-by-Step Horizontal Flow */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 40 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Desktop Flow */}
              <div className="hidden lg:flex items-start justify-between max-w-6xl mx-auto relative">
                {/* Connection Line */}
                <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-[#434BE6]/20 via-[#6B5BF4]/40 to-[#7D5FF4]/20 z-0"></div>
                
                {[
                  {
                    number: "1",
                    icon: <TrendingUp className="h-6 w-6" />,
                    title: "Estratégia de Investimento",
                    subtitle: "Escolha o tipo de estratégia que deseja simular: venda futura, valorização patrimonial, rentabilidade com locação",
                    gradient: "from-[#434BE6] to-[#6B5BF4]",
                    delay: 0.1
                  },
                  {
                    number: "2", 
                    icon: <Building className="h-6 w-6" />,
                    title: "Informações do Imóvel",
                    subtitle: "Preencha os dados básicos do imóvel, podendo inclusive colocar o link da página do imóvel do seu site",
                    gradient: "from-[#6B5BF4] to-[#7D5FF4]",
                    delay: 0.2
                  },
                  {
                    number: "3",
                    icon: <CreditCard className="h-6 w-6" />,
                    title: "Dados da Compra", 
                    subtitle: "Adicione as condições de pagamento: entrada, parcelas, reforços e correções",
                    gradient: "from-[#7D5FF4] to-[#434BE6]",
                    delay: 0.3
                  },
                  {
                    number: "4",
                    icon: <BarChart3 className="h-6 w-6" />,
                    title: "Cenários",
                    subtitle: "Defina um ou mais cenários que você quer fazer a projeção: conservador, padrão, otimista",
                    gradient: "from-[#434BE6] to-[#7D5FF4]",
                    delay: 0.4
                  },
                  {
                    number: "5",
                    icon: <Calculator className="h-6 w-6" />,
                    title: "Projeções Financeiras",
                    subtitle: "Defina as porcentagens de valorização, rendimentos, despesas, e outros dados financeiros que você imagina para o imóvel",
                    gradient: "from-[#6B5BF4] to-[#434BE6]",
                    delay: 0.5
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      initial: { opacity: 0, y: 60, scale: 0.8 },
                      animate: { opacity: 1, y: 0, scale: 1 }
                    }}
                    transition={{
                      duration: 0.6,
                      delay: step.delay,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{
                      y: -8,
                      scale: 1.05,
                      transition: { duration: 0.3 }
                    }}
                    className="relative flex-1 group"
                  >
                    {/* Floating Step Card */}
                    <motion.div
                      animate={{
                        y: [0, -5, 0],
                        rotateY: [0, 3, 0]
                      }}
                      transition={{
                        duration: 4 + index * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-500 text-center max-w-[200px]"
                      style={{
                        boxShadow: `0 20px 40px rgba(67, 75, 230, 0.1), 0 8px 16px rgba(67, 75, 230, 0.05)`
                      }}
                    >
                      {/* Floating gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-5 rounded-2xl group-hover:opacity-10 transition-opacity duration-500`}></div>
                      
                      {/* Step Number Circle */}
                      <div className="flex flex-col items-center mb-4">
                        <span className={`text-xs font-medium mb-1 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                          passo
                        </span>
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{
                            duration: 3 + index * 0.3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className={`relative w-10 h-10 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-500`}
                        >
                          <span className="text-white font-bold text-sm">{step.number}</span>
                          
                          {/* Glowing effect */}
                          <motion.div
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-full blur-md -z-10`}
                          />
                        </motion.div>
                      </div>
                      

                      
                      {/* Title */}
                      <motion.h3
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                        }}
                        transition={{
                          duration: 6 + index,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className={`font-bold text-sm mb-3 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}
                        style={{
                          backgroundSize: '200% 200%',
                          filter: 'drop-shadow(0 2px 4px rgba(67, 75, 230, 0.1))'
                        }}
                      >
                        {step.title}
                      </motion.h3>
                      
                      {/* Subtitle */}
                      <p className="text-gray-600 text-xs leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                        {step.subtitle}
                      </p>
                      
                      {/* Floating corner accents */}
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{
                          duration: 8 + index,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className={`absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br ${step.gradient} rounded-full opacity-60 blur-sm`}
                      />
                    </motion.div>
                    
                    {/* Arrow Connector (except last step) */}
                    {index < 4 && (
                      <motion.div
                        animate={{
                          x: [0, 5, 0],
                          opacity: [0.4, 0.8, 0.4]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute top-12 -right-4 z-10"
                      >
                        <div className={`w-8 h-8 bg-gradient-to-r ${step.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Mobile/Tablet Flow */}
              <div className="lg:hidden space-y-4 sm:space-y-6 px-2">
                {[
                  {
                    number: "1",
                    icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />,
                    title: "Estratégia de Investimento",
                    subtitle: "Escolha o tipo de estratégia que deseja simular: venda futura, valorização patrimonial, rentabilidade com locação",
                    gradient: "from-[#434BE6] to-[#6B5BF4]"
                  },
                  {
                    number: "2", 
                    icon: <Building className="h-4 w-4 sm:h-5 sm:w-5" />,
                    title: "Informações do Imóvel",
                    subtitle: "Preencha os dados básicos do imóvel, podendo inclusive colocar o link da página do imóvel do seu site",
                    gradient: "from-[#6B5BF4] to-[#7D5FF4]"
                  },
                  {
                    number: "3",
                    icon: <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />,
                    title: "Dados da Compra", 
                    subtitle: "Adicione as condições de pagamento: entrada, parcelas, reforços e correções",
                    gradient: "from-[#7D5FF4] to-[#434BE6]"
                  },
                  {
                    number: "4",
                    icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />,
                    title: "Cenários",
                    subtitle: "Defina um ou mais cenários que você quer fazer a projeção: conservador, padrão, otimista",
                    gradient: "from-[#434BE6] to-[#7D5FF4]"
                  },
                  {
                    number: "5",
                    icon: <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />,
                    title: "Projeções Financeiras",
                    subtitle: "Defina as porcentagens de valorização, rendimentos, despesas, e outros dados financeiros que você imagina para o imóvel",
                    gradient: "from-[#6B5BF4] to-[#434BE6]"
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      initial: { opacity: 0, x: -40 },
                      animate: { opacity: 1, x: 0 }
                    }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 bg-white/90 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                      {/* Step Number and Icon */}
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-medium mb-0.5 sm:mb-1 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                            passo
                          </span>
                          <div className={`w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                            <span className="text-white font-bold text-xs">{step.number}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className={`font-bold text-sm sm:text-base mb-1.5 sm:mb-2 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                          {step.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                    
                    {/* Connector Line for Mobile */}
                    {index < 4 && (
                      <div className="flex justify-center my-2 sm:my-3">
                        <motion.div
                          animate={{
                            y: [0, -3, 0]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <ArrowDown className={`h-4 sm:h-5 w-4 sm:w-5 text-[#434BE6] opacity-60`} />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Description Text with Emotions */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-center mt-8 sm:mt-16 mb-6 sm:mb-8 px-2"
            >
              <div className="max-w-4xl mx-auto">
                <motion.p 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="text-sm sm:text-lg lg:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-6 bg-gradient-to-r from-gray-700 via-[#434BE6] to-gray-700 bg-clip-text"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  Após seguir esses passos, você terá um{" "}
                  <motion.span
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="font-bold bg-gradient-to-r from-[#434BE6] to-[#7D5FF4] bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 200%' }}
                  >
                    ✨ link exclusivo
                  </motion.span>{" "}
                  com o relatório completo e visual da projeção, pronto para enviar ao seu cliente.
                </motion.p>
                
                <motion.p 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ 
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="text-sm sm:text-lg lg:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-6 bg-gradient-to-r from-gray-700 via-[#6B5BF4] to-gray-700 bg-clip-text"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  O relatório é personalizado com{" "}
                  <motion.span
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="font-bold bg-gradient-to-r from-[#6B5BF4] to-[#434BE6] bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 200%' }}
                  >
                    🎯 seu nome, sua logo e o nome da sua imobiliária
                  </motion.span>{" "}
                  entregando uma apresentação profissional e de alto padrão.
                </motion.p>
                
                <motion.p 
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ 
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="text-sm sm:text-lg lg:text-xl text-gray-700 leading-relaxed bg-gradient-to-r from-gray-700 via-[#7D5FF4] to-gray-700 bg-clip-text"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  E o melhor: você poderá saber{" "}
                  <motion.span
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="font-bold bg-gradient-to-r from-[#7D5FF4] to-[#6B5BF4] bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 200%' }}
                  >
                    🚀 quando o cliente visualizou o link, e quantas vezes
                  </motion.span>{" "}
                  ajudando você a identificar o momento certo de retomar o contato e{" "}
                  <motion.span
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="font-bold bg-gradient-to-r from-[#434BE6] to-[#7D5FF4] bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 200%' }}
                  >
                    💼 aumentar suas chances de fechar a venda
                  </motion.span>.
                </motion.p>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              variants={{
                initial: { opacity: 0, y: 20, scale: 0.9 },
                animate: { opacity: 1, y: 0, scale: 1 }
              }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="text-center px-2"
            >
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(67, 75, 230, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open('https://roimob.com.br/public/report/puzeaoa6xsvz2fg368cci', '_blank')}
                className="group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] text-white font-semibold rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-sm sm:text-base"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 6s ease infinite'
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.div>
                <span>Ver um Relatório Modelo</span>
                
                {/* Glowing effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] rounded-xl sm:rounded-2xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300"
                />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Video Demo Section */}
      <section id="video-demo" className="relative py-20 overflow-hidden bg-gradient-to-br from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4]">
        {/* Enhanced Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 -right-16 w-48 h-48 bg-white/3 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute bottom-1/3 left-1/5 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-28 h-28 bg-white/4 rounded-full blur-2xl animate-bounce delay-500"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 bg-white/6 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center sm:mb-12 mt-[10px] mb-[10px]"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl text-white font-semibold sm:mt-[10px] sm:mb-6 px-2 mt-[10px] mb-[10px]"
            >
              Veja como funciona na prática, em{" "}
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent font-extrabold">
                apenas 5 minutos
              </span>
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-white/90 max-w-4xl mx-auto text-sm sm:text-base lg:text-lg px-2 mb-8 sm:mb-12"
            >
              Assista a um tour completo pela plataforma e descubra como gerar projeções imobiliárias profissionais de forma simples, rápida e personalizada.
            </motion.p>
          </motion.div>

          {/* Video Container */}
          <motion.div
            variants={fadeInUp}
            className="relative max-w-4xl mx-auto"
          >
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20 shadow-2xl">
              {/* YouTube Video Embed */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src="https://www.youtube.com/embed/fVa7RjRCa-k"
                  title="ROImob - Como funciona na prática"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full rounded-xl"
                ></iframe>
              </div>
              
              {/* Decorative Elements */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-2 -left-2 w-4 h-4 bg-gradient-to-br from-white to-blue-100 rounded-full blur-sm"
              />
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-tl from-white to-purple-100 rounded-full blur-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>
      {/* Features Section */}
      <section className="relative py-12 sm:py-20 overflow-hidden">
        {/* Modern Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
          <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/5 via-[#6B5BF4]/3 to-[#7D5FF4]/5"></div>
        </div>

        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-10 sm:-top-20 -left-10 sm:-left-20 w-16 sm:w-32 h-16 sm:h-32 bg-gradient-to-br from-[#434BE6] to-[#6B5BF4] opacity-15 blur-2xl rounded-full"
          />
          <motion.div 
            animate={{ 
              rotate: [360, 0],
              y: [0, -40, 0]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 -right-8 sm:-right-16 w-12 sm:w-24 h-12 sm:h-24 bg-gradient-to-tl from-[#7D5FF4] to-[#6B5BF4] opacity-20 blur-xl"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
          />
          <motion.div 
            animate={{ 
              x: [0, 30, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 18,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/3 left-1/4 w-20 sm:w-40 h-20 sm:h-40 bg-gradient-to-r from-[#6B5BF4] to-[#7D5FF4] opacity-10 blur-2xl"
            style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          {/* Section Title */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-8 sm:mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6"
            >
              Recursos que valorizam sua apresentação e{" "}
              <span className="text-[#434BE6]">fortalecem sua venda</span>
            </motion.h2>
          </motion.div>

          {/* Floating Features Grid - Full Width */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 px-2"
          >
            {[
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Projeções realistas com 3 cenários",
                description: "Conservador, realista e otimista - para que o investidor tome decisão baseada em dados",
                gradient: "from-[#434BE6] to-[#6B5BF4]",
                delay: 0.1
              },
              {
                icon: <Calculator className="h-6 w-6" />,
                title: "ROI, TIR, lucro líquido, DRE e custo total",
                description: "Todos os indicadores financeiros que investidor profissional precisa ver",
                gradient: "from-[#6B5BF4] to-[#7D5FF4]",
                delay: 0.2
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Correções automáticas atualizadas",
                description: "INCC, IPCA, IGP-M, CUB-SC e outros índices sempre atualizados automaticamente",
                gradient: "from-[#7D5FF4] to-[#434BE6]",
                delay: 0.3
              },
              {
                icon: <ArrowDown className="h-6 w-6" />,
                title: "Fluxo de caixa mês a mês",
                description: "Visualização completa de entradas e saídas ao longo de todo o investimento",
                gradient: "from-[#434BE6] to-[#7D5FF4]",
                delay: 0.4
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Link profissional compartilhável",
                description: "Envie relatórios com visual profissional que impressiona e gera confiança",
                gradient: "from-[#6B5BF4] to-[#434BE6]",
                delay: 0.5
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Rastreamento de visualização",
                description: "Saiba quando e quantas vezes seu cliente visualizou a projeção",
                gradient: "from-[#7D5FF4] to-[#6B5BF4]",
                delay: 0.6
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Gráficos interativos",
                description: "Visualize o desempenho do investimento com gráficos dinâmicos e fáceis de entender. Mais clareza para você, mais confiança para o cliente.",
                gradient: "from-[#434BE6] to-[#7D5FF4]",
                delay: 0.7
              },
              {
                icon: <UserCheck className="h-6 w-6" />,
                title: "Identidade personalizada",
                description: "Adicione sua logo, nome e o da sua imobiliária no cabeçalho do relatório. Entregue uma apresentação com a sua marca, mais profissional e confiável.",
                gradient: "from-[#6B5BF4] to-[#434BE6]",
                delay: 0.8
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                variants={{
                  initial: { opacity: 0, y: 60, scale: 0.9 },
                  animate: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: feature.delay,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className="group relative"
              >
                {/* Floating Card */}
                <motion.div
                  animate={{ 
                    y: [0, -5, 0],
                    rotateX: [0, 2, 0]
                  }}
                  transition={{ 
                    duration: 6 + index,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500"
                  style={{
                    boxShadow: `0 20px 40px rgba(67, 75, 230, 0.1), 0 8px 16px rgba(67, 75, 230, 0.05)`
                  }}
                >
                  {/* Floating gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-xl sm:rounded-2xl group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Floating icon container */}
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 4 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`relative w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-500`}
                  >
                    <div className="text-white">
                      <div className="h-5 w-5 sm:h-6 sm:w-6">
                        {feature.icon}
                      </div>
                    </div>
                    
                    {/* Glowing effect */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl blur-md -z-10`}
                    />
                  </motion.div>
                  
                  {/* Floating title */}
                  <motion.h3 
                    animate={{ 
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{ 
                      duration: 8 + index,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className={`relative font-bold text-sm sm:text-lg mb-2 sm:mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}
                    style={{ 
                      backgroundSize: '200% 200%',
                      filter: 'drop-shadow(0 2px 4px rgba(67, 75, 230, 0.1))'
                    }}
                  >
                    {feature.title}
                  </motion.h3>
                  
                  {/* Floating description */}
                  <motion.p 
                    initial={{ opacity: 0.8 }}
                    whileHover={{ opacity: 1 }}
                    className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300 text-xs sm:text-sm"
                  >
                    {feature.description}
                  </motion.p>
                  
                  {/* Floating corner accent */}
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      duration: 10 + index,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className={`absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br ${feature.gradient} rounded-full opacity-60 blur-sm`}
                  />
                  
                  {/* Bottom floating accent */}
                  <motion.div
                    animate={{ 
                      x: [0, 10, 0],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ 
                      duration: 5 + index * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr ${feature.gradient} rounded-full opacity-40 blur-sm`}
                  />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Investment Strategies Section */}
      <section className="pt-6 sm:pt-8 pb-12 sm:pb-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-6 sm:mb-8 px-2"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6"
            >
              Dados precisos para diferentes{" "}
              <span className="text-[#434BE6]">estratégias de investimento</span>
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Crie simulações de investimento de acordo com o perfil e objetivo do seu cliente
            </motion.p>
          </motion.div>

          <div className="space-y-8 sm:space-y-12">
            {/* Strategy 1: Venda Futura - Video Focused Layout */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20">
                {/* Video Section - Top and Prominent */}
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: -30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.8 }}
                  className="relative bg-gradient-to-br from-[#434BE6] via-[#5B63F5] to-[#7B83FF] p-4 sm:p-8 lg:p-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                      {/* Content Section - Mobile First, Desktop Left */}
                      <div className="order-1 lg:order-1 lg:w-1/3">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          <span className="text-xs sm:text-sm font-semibold text-white">Estratégia </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                          Venda Futura
                        </h3>
                        <p className="text-blue-100 mt-2 sm:mt-[12px] mb-2 sm:mb-[12px] text-sm sm:text-[16px]">
                          Mostre quanto o cliente pode lucrar revendendo o imóvel em determinado mês futuro, 
                          com base em cenários realista, otimista e conservador.
                        </p>

                        {/* Dados Precisos Section - Modern Enhanced Design */}
                        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/30 shadow-2xl">
                          {/* Modern Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/10 to-transparent rounded-xl sm:rounded-4xl"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            {/* Header with Icon */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[#434BE6]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#434BE6]/30">
                                <BarChart3 className="h-3 sm:h-4 w-3 sm:w-4 text-[#434BE6]" />
                              </div>
                              <h4 className="text-lg sm:text-xl font-bold text-white">Obtenha Dados Precisos</h4>
                            </div>
                            
                            {/* Clean List Layout */}
                            <div className="space-y-2">
                              {[
                                { title: "Valor estimado de revenda no futuro" },
                                { title: "Lucro líquido projetado" },
                                { title: "ROI e TIR (Taxa Interna de Retorno)" },
                                { title: "Fluxo de Caixa Resumido" },
                                { title: "Demonstrativo do Resultado (DRE)" },
                                { title: "Comparação entre cenários" },
                                { title: "Gráficos Interativos" }
                              ].map((item, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.08 + 0.4 }}
                                  className="group flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 transition-all duration-300 text-[14px] pt-[2px] pb-[2px] pl-[2px] pr-[2px] mt-[2px] mb-[2px]"
                                >
                                  {/* Enhanced Icon - Smaller */}
                                  <div className="w-6 h-6 bg-[#434BE6] backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                                  </div>
                                  
                                  {/* Text Content */}
                                  <h5 className="font-semibold text-white group-hover:text-white/95 transition-colors duration-300 text-[13px]">
                                    {item.title}
                                  </h5>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Modern Corner Accent */}
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#434BE6] to-[#434BE6]/60 rounded-full opacity-80 blur-sm"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr from-white/30 to-white/10 rounded-full opacity-60 blur-sm"></div>
                        </div>
                      </div>
                      
                      {/* Video Section - Mobile Last, Desktop Right */}
                      <div className="order-2 lg:order-2 lg:w-2/3 lg:pl-8">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="relative"
                        >
                          <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-xl"></div>
                          <div className="relative bg-transparent rounded-xl overflow-hidden shadow-2xl border-4 border-white/30">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              className="w-full h-auto rounded-xl"
                              onLoadStart={() => console.log('Video load started')}
                              onCanPlay={() => console.log('Video can play')}
                              onError={(e) => console.log('Video load error - showing fallback')}
                            >
                              <source src="/assets/venda-futura.mov" type="video/mp4" />
                              <div className="flex items-center justify-center h-full text-white">
                                <div className="text-center">
                                  <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                                    <BarChart3 className="h-8 w-8 text-white" />
                                  </div>
                                  <p>Carregando demonstração...</p>
                                </div>
                              </div>
                            </video>
                          </div>
                          <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>


              </Card>
            </motion.div>

            {/* Strategy 2: Valorização Patrimonial - Video Focused Layout */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20">
                {/* Video Section - Top and Prominent */}
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: -30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.8 }}
                  className="relative bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#A855F7] p-4 sm:p-8 lg:p-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                      {/* Content Section - Mobile First, Desktop Right */}
                      <div className="order-1 lg:order-2 lg:w-1/3">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          <span className="text-xs sm:text-sm font-semibold text-white">Estratégia</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                          Valorização Patrimonial
                        </h3>
                        <p className="text-purple-100 mt-2 sm:mt-[12px] mb-2 sm:mb-[12px] text-sm sm:text-[16px]">
                          Ideal para mostrar o crescimento do patrimônio com o tempo, demonstrando ao investidor o potencial de valorização do imóvel ao longo dos anos.
                        </p>

                        {/* Dados Precisos Section - Modern Enhanced Design */}
                        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/30 shadow-2xl">
                          {/* Modern Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/10 to-transparent rounded-xl sm:rounded-4xl"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            {/* Header with Icon */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[#6366F1]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#6366F1]/30">
                                <TrendingUp className="h-3 sm:h-4 w-3 sm:w-4 text-[#6366F1]" />
                              </div>
                              <h4 className="text-lg sm:text-xl font-bold text-white">Obtenha Dados Precisos</h4>
                            </div>
                            
                            {/* Clean List Layout */}
                            <div className="space-y-2">
                              {[
                                { title: "Evolução do patrimônio acumulado" },
                                { title: "Gráfico de valorização ano a ano" },
                                { title: "Percepção clara de ganho patrimonial" }
                              ].map((item, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.08 + 0.4 }}
                                  className="group flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 transition-all duration-300 text-[14px] pt-[2px] pb-[2px] pl-[2px] pr-[2px] mt-[2px] mb-[2px]"
                                >
                                  {/* Enhanced Icon - Smaller */}
                                  <div className="w-6 h-6 bg-[#6366F1] backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                                  </div>
                                  
                                  {/* Text Content */}
                                  <h5 className="font-semibold text-white group-hover:text-white/95 transition-colors duration-300 text-[13px]">
                                    {item.title}
                                  </h5>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Modern Corner Accent */}
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#6366F1] to-[#6366F1]/60 rounded-full opacity-80 blur-sm"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr from-white/30 to-white/10 rounded-full opacity-60 blur-sm"></div>
                        </div>
                      </div>
                      
                      {/* Video Section - Mobile Last, Desktop Left */}
                      <div className="order-2 lg:order-1 lg:w-2/3 lg:pr-8">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="relative"
                        >
                          <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-xl"></div>
                          <div className="relative bg-transparent rounded-xl overflow-hidden shadow-2xl border-4 border-white/30">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              className="w-full h-auto rounded-xl"
                              onLoadStart={() => console.log('Video load started')}
                              onCanPlay={() => console.log('Video can play')}
                              onError={(e) => console.log('Video load error - showing fallback')}
                            >
                              <source src="/assets/valorizacao-patrimonial.mov" type="video/mp4" />
                              <div className="flex items-center justify-center h-full text-white">
                                <div className="text-center">
                                  <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-8 w-8 text-white" />
                                  </div>
                                  <p>Carregando demonstração...</p>
                                </div>
                              </div>
                            </video>
                          </div>
                          <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <div className="w-3 h-3 bg-[#6366F1] rounded-full animate-pulse"></div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>


              </Card>
            </motion.div>

            {/* Strategy 3: Rentabilidade com Locação - Video Focused Layout */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20">
                {/* Video Section - Top and Prominent */}
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: -30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.8 }}
                  className="relative bg-gradient-to-br from-[#434BE6] via-[#3B82F6] to-[#2563EB] p-4 sm:p-8 lg:p-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                      {/* Content Section - Mobile First, Desktop Left */}
                      <div className="order-1 lg:order-1 lg:w-1/3">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                          <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          <span className="text-xs sm:text-sm font-semibold text-white">Estratégia</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                          Rentabilidade com Locação
                        </h3>
                        <p className="text-blue-100 mt-2 sm:mt-[12px] mb-2 sm:mb-[12px] text-sm sm:text-[16px]">
                          Para investidores que pensam em renda passiva. Mostre quanto ele pode ganhar com rendimentos de locação.
                        </p>

                        {/* Dados Precisos Section - Modern Enhanced Design */}
                        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/30 shadow-2xl">
                          {/* Modern Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/10 to-transparent rounded-xl sm:rounded-4xl"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            {/* Header with Icon */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[#434BE6]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#434BE6]/30">
                                <Calculator className="h-3 sm:h-4 w-3 sm:w-4 text-[#434BE6]" />
                              </div>
                              <h4 className="text-lg sm:text-xl font-bold text-white">Obtenha Dados Precisos</h4>
                            </div>
                            
                            {/* Clean List Layout */}
                            <div className="space-y-2">
                              {[
                                { title: "Estimativa mensal de aluguel" },
                                { title: "Renda Mensal e Anual Líquida" },
                                { title: "CAP Rate Mensal e Anual" },
                                { title: "Gráfico de Fluxo de Caixa ano a ano" },
                                { title: "Análise Anual de Rendimentos" },
                                { title: "Gráficos Interativos" }
                              ].map((item, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.08 + 0.4 }}
                                  className="group flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 transition-all duration-300 text-[14px] pt-[2px] pb-[2px] pl-[2px] pr-[2px] mt-[2px] mb-[2px]"
                                >
                                  {/* Enhanced Icon - Smaller */}
                                  <div className="w-6 h-6 bg-[#434BE6] backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                                  </div>
                                  
                                  {/* Text Content */}
                                  <h5 className="font-semibold text-white group-hover:text-white/95 transition-colors duration-300 text-[13px]">
                                    {item.title}
                                  </h5>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Modern Corner Accent */}
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#434BE6] to-[#434BE6]/60 rounded-full opacity-80 blur-sm"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr from-white/30 to-white/10 rounded-full opacity-60 blur-sm"></div>
                        </div>
                      </div>
                      
                      {/* Video Section - Mobile Last, Desktop Right */}
                      <div className="order-2 lg:order-2 lg:w-2/3 lg:pl-8">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="relative"
                        >
                          <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-xl"></div>
                          <div className="relative bg-transparent rounded-xl overflow-hidden shadow-2xl border-4 border-white/30">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              className="w-full h-auto rounded-xl"
                              onLoadStart={() => console.log('Video load started')}
                              onCanPlay={() => console.log('Video can play')}
                              onError={(e) => console.log('Video load error - showing fallback')}
                            >
                              <source src="/assets/rentabilidade-locacao.mov" type="video/mp4" />
                              <div className="flex items-center justify-center h-full text-white">
                                <div className="text-center">
                                  <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                                    <Calculator className="h-8 w-8 text-white" />
                                  </div>
                                  <p>Carregando demonstração...</p>
                                </div>
                              </div>
                            </video>
                          </div>
                          <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>


              </Card>
            </motion.div>

            {/* New Section Title for Calculator */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-8 mt-8 sm:mt-16"
            >
              <motion.h2 
                variants={fadeInUp}
                className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6"
              >
                E mais:{" "}
                <span className="text-[#434BE6]">simule financiamentos na planta em segundos</span>
              </motion.h2>
            </motion.div>

            {/* Strategy 4: Calculadora Financeira - Video Focused Layout */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <Card className="overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-gray-50/30 to-slate-50/20">
                {/* Video Section - Top and Prominent */}
                <motion.div
                  variants={{
                    initial: { opacity: 0, y: -30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.8 }}
                  className="relative bg-gradient-to-br from-[#6B7280] via-[#9CA3AF] to-[#D1D5DB] p-8 lg:p-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
                      {/* Content Section - Mobile First, Desktop Right */}
                      <div className="order-1 lg:order-2 lg:w-1/3">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                          <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          <span className="text-xs sm:text-sm font-semibold text-[#374151]">Ferramenta</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-[#374151]">
                          Calculadora Financeira
                        </h3>
                        <p className="mt-2 sm:mt-[12px] mb-2 sm:mb-[12px] text-sm sm:text-[16px] text-[#374151]">
                          A calculadora mais completa para imóveis em planta. Calcule em segundos o valor corrigido de cada parcela, reforços e chaves.
                        </p>

                        {/* Dados Precisos Section - Modern Enhanced Design */}
                        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/30 shadow-2xl">
                          {/* Modern Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#6B7280]/10 to-transparent rounded-xl sm:rounded-4xl"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            {/* Header with Icon */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[#6B7280]/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#6B7280]/30">
                                <Calculator className="h-3 sm:h-4 w-3 sm:w-4 text-[#6B7280]" />
                              </div>
                              <h4 className="text-lg sm:text-xl font-bold text-[#374151]">Obtenha Dados Precisos</h4>
                            </div>
                            
                            {/* Clean List Layout */}
                            <div className="space-y-2">
                              {[
                                { title: "Valor total do investimento corrigido" },
                                { title: "Entrada, parcelas, reforços e chaves corrigidos" },
                                { title: "Correções antes e depois das chaves" },
                                { title: "Gráficos de amortização e fluxo de pagamento" },
                                { title: "Tabela completa com todo o fluxo de pagamento" },
                                { title: "Exporte em pdf com um clique" }
                              ].map((item, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.08 + 0.4 }}
                                  className="group flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 transition-all duration-300 text-[14px] pt-[2px] pb-[2px] pl-[2px] pr-[2px] mt-[2px] mb-[2px]"
                                >
                                  {/* Enhanced Icon - Smaller */}
                                  <div className="w-6 h-6 bg-[#6B7280] backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                                  </div>
                                  
                                  {/* Text Content */}
                                  <h5 className="font-semibold group-hover:text-white/95 transition-colors duration-300 text-[13px] text-[#374151]">
                                    {item.title}
                                  </h5>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Modern Corner Accent */}
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#6B7280] to-[#6B7280]/60 rounded-full opacity-80 blur-sm"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr from-white/30 to-white/10 rounded-full opacity-60 blur-sm"></div>
                        </div>
                      </div>
                      
                      {/* Video Section - Mobile Last, Desktop Left */}
                      <div className="order-2 lg:order-1 lg:w-2/3 lg:pr-8">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="relative"
                        >
                          <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-xl"></div>
                          <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-2xl border-4 border-white/30">
                            <video
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover rounded-xl"
                              onLoadStart={() => console.log('Video load started')}
                              onCanPlay={() => console.log('Video can play')}
                              onError={(e) => console.log('Video load error - showing fallback')}
                            >
                              <source src="/assets/calculadora-financeira.mov" type="video/mp4" />
                              <div className="flex items-center justify-center h-full text-white">
                                <div className="text-center">
                                  <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                                    <Calculator className="h-8 w-8 text-white" />
                                  </div>
                                  <p>Carregando demonstração...</p>
                                </div>
                              </div>
                            </video>
                          </div>
                          <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <div className="w-3 h-3 bg-[#6B7280] rounded-full animate-pulse"></div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>


              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Social Proof Section - Modern Redesign */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Gradient - Matching Brand Theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/40"></div>
        {/* Enhanced Floating Elements */}
        <div className="absolute top-12 left-20 w-28 h-28 bg-gradient-to-br from-[#434BE6]/15 via-[#6B5BF4]/12 to-[#7D5FF4]/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-16 right-24 w-36 h-36 bg-gradient-to-tl from-[#7D5FF4]/15 via-[#6B5BF4]/12 to-[#434BE6]/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-[#6B5BF4]/10 to-[#7D5FF4]/10 rounded-full blur-xl animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '4s' }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold mb-6"
            >
              Corretores que já{" "}
              <motion.span 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] bg-clip-text text-transparent bg-[length:200%_100%]"
              >
                transformaram
              </motion.span>{" "}
              <span className="text-gray-900">suas vendas</span>
            </motion.h2>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                name: "Carlos Mendes",
                role: "Corretor Especialista em Investimentos",
                content: "Antes eu só falava que o imóvel ia valorizar. Agora mostro exatamente quanto e quando. Tem me ajudado bastante para convertar mais vendas com investidores",
                rating: 5,
                location: "São Paulo, SP",
                gradient: "from-[#434BE6] to-[#6B5BF4]",
                borderGradient: "from-[#434BE6]/30 to-[#6B5BF4]/30"
              },
              {
                name: "Ana Rodrigues",
                role: "Corretora de imóveis",
                content: "Sempre tinha dificuldade em calcular para meus clientes quanto aproximadamente seria o valor corrigido dos imóveis na planta. Agora eu calculo tudo super rápido e com mais precisão.",
                rating: 5,
                location: "Rio de Janeiro, RJ",
                gradient: "from-[#6B5BF4] to-[#7D5FF4]",
                borderGradient: "from-[#6B5BF4]/30 to-[#7D5FF4]/30"
              },
              {
                name: "Roberto Silva",
                role: "Corretor Autônomo",
                content: "O link compartilhável mudou meu jogo. Envio a projeção e vejo quando o cliente acessa. Minha apresentação ficou profissional de verdade.",
                rating: 5,
                location: "Balneário Camboriú, SC",
                gradient: "from-[#7D5FF4] to-[#434BE6]",
                borderGradient: "from-[#7D5FF4]/30 to-[#434BE6]/30"
              }
            ].map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp} className="group">
                <div className="relative h-full bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/50 hover:border-gradient transform hover:-translate-y-2 hover:scale-105">
                  {/* Modern Accent Line */}
                  <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r ${testimonial.borderGradient} rounded-full`}></div>
                  
                  {/* Floating Corner Element */}
                  <div className={`absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br ${testimonial.borderGradient} rounded-full blur-sm group-hover:scale-110 transition-transform duration-500`}></div>
                  
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Comparison Table Section */}
      <section className="relative py-12 sm:py-20 bg-gradient-to-br from-slate-50 via-white to-purple-50/40 overflow-hidden pt-[30px] pb-[30px]">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-32 sm:w-56 h-32 sm:h-56 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-40 sm:w-72 h-40 sm:h-72 bg-gradient-to-r from-purple-500/15 to-violet-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-8 sm:mb-16 px-2"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-block mb-3 sm:mb-4"
            >
              <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] rounded-full mx-auto"></div>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-xl sm:text-3xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]"
            >
              <img 
                src="/assets/logo-full-400x100.png" 
                alt="ROImob" 
                className="inline-block h-8 sm:h-12 lg:h-16 w-auto align-middle ml-[0px] mr-[0px]"
              />
              vs Métodos Tradicionais
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Veja a diferença entre usar nossa plataforma e continuar com planilhas e WhatsApp
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 relative">
              {/* Floating corner elements */}
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-gradient-to-br from-[#434BE6] to-[#6B5BF4] rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-[#6B5BF4] to-[#7D5FF4] rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-br from-[#7D5FF4] to-[#434BE6] rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-[#434BE6] rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}></div>

              {/* Compact Headers */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 border-b border-gray-200/50 pt-[6px] pb-[6px]">
                <div className="text-center">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900">Recursos</h3>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                    <div className="w-4 sm:w-6 h-4 sm:h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                      <X className="h-2 sm:h-3 w-2 sm:w-3 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 hidden sm:inline">Tradicional</span>
                    <span className="text-xs font-bold text-gray-900 sm:hidden">Tradicional</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600">Planilhas</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                    <div className="w-4 sm:w-6 h-4 sm:h-6 bg-gradient-to-br from-[#434BE6] to-[#7D5FF4] rounded-full flex items-center justify-center">
                      <Check className="h-2 sm:h-3 w-2 sm:w-3 text-white" />
                    </div>
                    <img 
                      src="/assets/logo-full-400x100.png" 
                      alt="ROImob" 
                      className="h-3 sm:h-4 w-auto"
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs bg-gradient-to-r from-[#434BE6] to-[#7D5FF4] bg-clip-text text-transparent font-semibold">Completo</p>
                </div>
              </div>

              {/* Compact Comparison Grid */}
              <div className="p-4 space-y-1.5">
                {[
                  "Cálculos ROI e TIR automáticos",
                  "Correções monetárias atualizadas", 
                  "3 cenários de projeção",
                  "Relatórios profissionais",
                  "Links compartilháveis",
                  "Rastreamento de visualização",
                  "Interface responsiva",
                  "Suporte especializado"
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="grid grid-cols-3 gap-4 py-1.5 px-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30 hover:bg-white/60 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{feature}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-[#434BE6] to-[#7D5FF4] rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Compact Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-center p-4 border-t border-gray-200/50 bg-gradient-to-r from-[#434BE6]/5 to-[#7D5FF4]/5"
              >
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Pare de perder tempo</strong> com métodos ultrapassados
                </p>
                <Button 
                  onClick={() => window.location.href = '/auth/register'}
                  className="bg-gradient-to-r from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4] hover:from-[#3A42D4] hover:via-[#5B4FE6] hover:to-[#6D4FE6] text-white px-6 py-2 text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Modernizar Agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Pricing Section - Modern Design with Patrimonial Background */}
      <section id="pricing" className="relative py-8 sm:py-20 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/40 pt-[30px] pb-[30px]">
        {/* Animated Floating Elements - Same as Valorização Patrimonial */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-20 -left-20 w-32 h-32 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] opacity-15 blur-2xl rounded-full"
          />
          <motion.div 
            animate={{ 
              rotate: [360, 0],
              y: [0, -40, 0]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 -right-16 w-24 h-24 bg-gradient-to-tl from-[#A855F7] to-[#8B5CF6] opacity-20 blur-xl"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
          />
          <motion.div 
            animate={{ 
              x: [0, 30, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 18,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 -left-12 w-20 h-20 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] opacity-25 blur-lg"
            style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-3/4 right-1/4 w-16 h-16 bg-gradient-to-br from-[#A855F7] to-[#6366F1] rounded-full blur-md"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div
              variants={{
                initial: { opacity: 0, y: 40 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8 }}
              className="relative inline-block mt-[0px] mb-[0px]"
            >
              <motion.h2 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7] bg-clip-text text-transparent mb-4 pt-[10px] pb-[10px]"
                style={{
                  backgroundSize: '200% 200%',
                  filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.15))'
                }}
              >
                Pague menos que um{" "}
                <motion.span
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="bg-gradient-to-r from-[#A855F7] via-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  cafezinho por dia
                </motion.span>
              </motion.h2>
              
              {/* Floating accent around title */}
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -inset-6 bg-gradient-to-r from-[#6366F1]/8 to-[#A855F7]/8 rounded-full blur-xl -z-10"
              />
            </motion.div>
            
            <motion.div
              variants={{
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.p 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-xl sm:text-2xl max-w-3xl mx-auto bg-gradient-to-r from-gray-700 via-[#6366F1] to-gray-700 bg-clip-text font-medium text-[#374151] mb-6"
                style={{ backgroundSize: '200% 200%' }}
              >E feche até 3x mais vendas com dados que impressionam investidores</motion.p>

              
            </motion.div>
          </motion.div>

          {/* Pricing Card - White Background */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              {/* Floating Badge */}
              <motion.div
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 2, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10"
              >
                <Badge className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white px-6 py-2 text-sm font-bold shadow-xl border-0">
                  All-in-One
                </Badge>
              </motion.div>

              {/* Main Pricing Card - Pure White */}
              <motion.div
                whileHover={{ 
                  y: -8,
                  scale: 1.02
                }}
                transition={{ duration: 0.3 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50"
                style={{
                  boxShadow: `0 30px 60px rgba(99, 102, 241, 0.15), 0 15px 30px rgba(99, 102, 241, 0.1)`
                }}
              >
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7] p-[2px] rounded-3xl">
                  <div className="bg-white rounded-3xl h-full w-full"></div>
                </div>

                <CardContent className="relative z-10 p-4 sm:p-8 text-center">
                  {/* Price Section */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <span className="text-sm sm:text-lg text-gray-500 line-through">R$ 147</span>
                      <Badge variant="destructive" className="text-xs font-bold">-34%</Badge>
                    </div>
                    <div className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent mb-2">
                      R$ 97
                    </div>
                    <div className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6">/mês</div>
                    
                    {/* Value Proposition */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 pt-[0px] pb-[0px] mt-[12px] mb-[12px]"
                    >
                      <p className="text-green-800 font-semibold text-sm sm:text-base">Desconto válido apenas até dia 31/07/2025</p>
                    </motion.div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {[
                      "1 usuário, projeções ilimitadas",
                      "Cálculos automáticos de ROI, TIR e rentabilidade",
                      "3 cenários de projeção (conservador, realista, otimista)",
                      "Correções monetárias sempre atualizadas",  
                      "Relatórios profissionais compartilháveis",
                      "Rastreamento de visualização dos clientes",
                      "Interface responsiva para todos dispositivos",
                      "Suporte especializado incluído"
                    ].map((feature, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.5 }}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 sm:gap-4 group"
                      >
                        <div className="w-5 sm:w-6 h-5 sm:h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Check className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
                        </div>
                        <span className="text-gray-700 text-left text-sm sm:text-base font-medium group-hover:text-gray-900 transition-colors duration-300">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={() => window.location.href = '/auth/register'}
                      size="lg" 
                      className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5B21B6] hover:to-[#7C3AED] text-white py-6 text-lg font-bold mb-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                      <motion.span
                        animate={{ 
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className="flex items-center gap-3"
                      >
                        Começar Agora
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    </Button>
                  </motion.div>
                  
                  <p className="text-sm text-gray-500 font-medium">Cancele quando quiser • Sem fidelidade • Suporte Dedicado</p>
                  
                  {/* 7-Day Guarantee Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="mt-6 bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 border-2 border-orange-200 rounded-xl p-4 relative overflow-hidden"
                  >
                    {/* Guarantee Seal */}
                    <div className="absolute -top-1 -right-1 w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                        <path d="M12 17L10.91 20.74L4 21L10.91 21.26L12 25L13.09 21.26L20 21L13.09 20.74L12 17Z"/>
                      </svg>
                    </div>
                    
                    <div className="pr-8">
                      <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/>
                        </svg>
                        Garantia incondicional de 7 dias
                      </h3>
                      <p className="text-orange-700 text-sm leading-relaxed text-center">Se em até 7 dias você decidir que o ROImob não é pra você, basta solicitar o reembolso. O valor será estornado direto no seu cartão de crédito.</p>
                    </div>
                    
                    {/* Subtle background decoration */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-200/30 to-yellow-200/30 rounded-full blur-2xl"></div>
                  </motion.div>
                </CardContent>

                {/* Floating Corner Elements */}
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full opacity-40 blur-sm"
                />
                <motion.div
                  animate={{ 
                    x: [0, 6, 0],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -bottom-3 -left-3 w-6 h-6 bg-gradient-to-tr from-[#A855F7] to-[#8B5CF6] rounded-full opacity-50 blur-sm"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#434BE6] via-[#6B5BF4] to-[#7D5FF4]">
        {/* Enhanced Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 -right-16 w-48 h-48 bg-white/3 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute bottom-1/3 left-1/5 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/4 w-28 h-28 bg-white/4 rounded-full blur-2xl animate-bounce delay-500"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 bg-white/6 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
            >
              Transforme suas vendas hoje mesmo
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-blue-100 mb-8"
            >Junte-se aos mais de 100 corretores que já fecham mais vendas com o ROImob</motion.p>
            <motion.div variants={fadeInUp}>
              <Button 
                onClick={() => window.location.href = '/auth/register'}
                size="lg" 
                className="bg-white text-[#434BE6] hover:bg-gray-100 px-8 py-4 text-lg font-bold"
              >
                Começar Agora Mesmo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="relative py-8 sm:py-12 px-2 sm:px-4 lg:px-8 overflow-hidden">
        {/* Background Gradient - Same as Metrics Section */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#434BE6]/12 via-[#6B5BF4]/10 to-[#7D5FF4]/12"></div>
        
        {/* Enhanced Floating Elements - Matching Metrics Theme */}
        <div className="absolute top-4 sm:top-8 left-8 sm:left-16 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-[#434BE6]/15 via-[#6B5BF4]/12 to-[#7D5FF4]/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-4 sm:bottom-8 right-8 sm:right-16 w-24 sm:w-40 h-24 sm:h-40 bg-gradient-to-tl from-[#7D5FF4]/15 via-[#6B5BF4]/12 to-[#434BE6]/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img 
                src="/assets/logo-full-400x100.png" 
                alt="ROImob" 
                className="h-8 sm:h-10 w-auto"
              />
            </div>
            
            {/* Links */}
            <div className="flex items-center gap-6 sm:gap-8">
              <a href="/auth/login" className="text-gray-700 hover:text-[#434BE6] font-medium text-sm sm:text-base transition-colors duration-300">
                Login
              </a>
              <a 
                href="#" 
                className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-[#434BE6] to-[#6B5BF4] rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-lg"
                title="Instagram"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-300/50 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-gray-600 text-sm sm:text-base">&copy; 2025 ROImob. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;