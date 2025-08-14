// FIXED: Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check if DATABASE_URL is loaded
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import MemoryStore from "memorystore";
// Import routes after env vars are loaded
import { setupVite, serveStatic, log } from "./vite";
// Import migrations after env vars are loaded

const app = express();

// Trust proxy for Cloudflare/Replit deployment (essential for cookies to work)
app.set('trust proxy', true);

// Redis client disabled temporarily - will be re-enabled when Redis is available
// const redisClient = createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379'
// });

// Session store configuration with MemoryStore persistence
const MemoryStoreInstance = MemoryStore(session);

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-dev',
  store: new MemoryStoreInstance({
    checkPeriod: 30 * 60 * 1000, // Check for expired sessions every 30 minutes
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
    stale: false,
    dispose: (key: string) => {
      console.log('🗑️ Session disposed:', key);
    }
  }),
  resave: false, // FIXED: Changed to false to prevent unnecessary session saves
  saveUninitialized: false, // FIXED: Changed to false to prevent creating sessions for unauthenticated users
  rolling: false, // FIXED: Changed to false to prevent session expiration reset on each request
  cookie: {
    secure: false, // false for development
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' as const
  }
};

console.log('🔧 Session configuration with logout fix:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  httpOnly: sessionConfig.cookie.httpOnly,
  maxAge: sessionConfig.cookie.maxAge,
  trustProxy: app.get('trust proxy'),
  resave: sessionConfig.resave,
  saveUninitialized: sessionConfig.saveUninitialized,
  rolling: sessionConfig.rolling
});

app.use(session(sessionConfig));

// FIXED: Simplified middleware to track session activity without forcing saves
app.use((req, res, next) => {
  // Only track activity for authenticated users without forcing session saves
  if (req.session?.userId) {
    const now = new Date();
    console.log(`🔄 Session activity for user ${req.session.userId} at ${now.toISOString()}`);
    
    // Update session activity timestamp without forcing save
    req.session.lastActivity = now.getTime();
  }
  next();
});

// FIXED: Simplified debug middleware without forced session saves
app.use((req, res, next) => {
  // Log all API requests that should require authentication
  if (req.path.startsWith('/api/users') || req.path.startsWith('/api/auth') || 
      req.path.startsWith('/api/clients') || req.path.startsWith('/api/properties') || 
      req.path.startsWith('/api/projections')) {
    console.log(`🔍 SESSION CHECK: ${req.method} ${req.path}`);
    console.log(`🔍 Session ID: ${req.session?.id || 'NO_SESSION_ID'}`);
    console.log(`🔍 User ID: ${req.session?.userId || 'NO_USER_ID'}`);
    console.log(`🔍 Cookie header: ${req.headers.cookie ? 'PRESENT' : 'MISSING'}`);
    console.log(`🔍 Session exists: ${!!req.session}`);
    console.log(`🔍 Session userId exists: ${!!req.session?.userId}`);
  }
  next();
});

// Debug middleware for webhook requests
app.use('/api/stripe', (req, res, next) => {
  console.log(`🔍 STRIPE API REQUEST: ${req.method} ${req.url}`);
  console.log(`🔍 Headers:`, req.headers);
  next();
});

// Webhook do Stripe precisa do raw body antes do parsing JSON
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Aumentar limite de tamanho das requisições JSON para 50MB (valor padrão é 100KB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve static files from public directory
app.use('/assets', express.static('public/assets', {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4') || path.endsWith('.mov')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Endpoint temporário para testar PDF sem autenticação
app.get('/test-pdf', async (req, res) => {
  let browser = null;
  const startTime = Date.now();
  
  try {
    console.log('[PDF-TEST] Iniciando teste de PDF sem autenticação...');
    
    // Importar puppeteer-core usando import dinâmico
    const puppeteer = await import('puppeteer-core');
    const fs = await import('fs');
    const path = await import('path');
    
    // Detectar dinamicamente o caminho do Chromium
    let executablePath = null;
    
    // Caminhos possíveis para o executável do Chromium
    const possiblePaths = [
      '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
      path.default.join(__dirname, '..', 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome'),
      // require('chromium').path, // Commented out - causes "require is not defined" error
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];
    
    console.log('[PDF-TEST] Detectando caminho do Chromium...');
    
    // Tentar encontrar o executável
    for (const testPath of possiblePaths) {
      try {
        if (testPath && fs.default.existsSync(testPath)) {
          executablePath = testPath;
          console.log(`[PDF-TEST] Chromium encontrado em: ${executablePath}`);
          break;
        }
      } catch (error) {
        console.log(`[PDF-TEST] Erro ao testar caminho ${testPath}:`, (error as Error).message);
        continue;
      }
    }
    
    if (!executablePath) {
      console.log('[PDF-TEST] Nenhum caminho válido encontrado, usando configuração padrão');
    }
    
    // Configurar navegador com otimizações para velocidade
    const browserOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--no-first-run',
        '--no-zygote',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-image-animation-resync',
        '--disable-sync',
        '--disable-plugins',
        '--disable-java'
      ]
    };
    
    // Adicionar executablePath apenas se encontrado
    if (executablePath) {
      browserOptions.executablePath = executablePath;
    }
    
    console.log('[PDF-TEST] Configuração do browser:', JSON.stringify(browserOptions, null, 2));
    
    // Inicializar Puppeteer
    browser = await puppeteer.default.launch(browserOptions);
    
    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Navegar para uma página simples
    await page.setContent(`
      <html>
        <head><title>Teste PDF</title></head>
        <body>
          <h1>Teste de PDF</h1>
          <p>Este é um teste básico de geração de PDF usando Puppeteer-core.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
    
    console.log('[PDF-TEST] Conteúdo HTML definido, gerando PDF...');
    
    // Gerar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '8mm',
        bottom: '8mm',
        left: '2mm',
        right: '2mm'
      },
      printBackground: true,
      preferCSSPageSize: false,
      timeout: 10000
    });
    
    console.log(`[PDF-TEST] PDF gerado em ${Date.now() - startTime}ms, tamanho: ${pdfBuffer.length} bytes`);
    
    // Enviar PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="teste-pdf.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
    
  } catch (error) {
    console.error('[PDF-TEST] Erro ao gerar PDF:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar PDF de teste', 
      details: (error as Error).message 
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[PDF-TEST] Browser fechado com sucesso');
      } catch (closeError) {
        console.error('[PDF-TEST] Erro ao fechar browser:', closeError);
      }
    }
  }
});

(async () => {
  const { registerRoutes } = await import('./routes');
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Executar migrações do banco de dados com tratamento de erro
  try {
    console.log('[Server] Iniciando migrações do banco de dados...');
    const { runMigrations } = await import('./migrations');
    await runMigrations();
    console.log('[Server] Migrações concluídas com sucesso');
  } catch (error) {
    console.error('[Server] Erro ao executar migrações:', error);
    console.log('[Server] Continuando inicialização do servidor sem migrações...');
  }
  
  // Inicializar scheduler de índices econômicos
  try {
    const { scheduler } = await import('./services/scheduler');
    scheduler.start();
    console.log('[Server] Scheduler de índices econômicos iniciado');
  } catch (error) {
    console.error('[Server] Erro ao inicializar scheduler:', error);
    console.log('[Server] Continuando sem scheduler...');
  }
  
  server.listen(port, () => {
    log(`Servidor rodando na porta ${port}`);
    console.log(`Servidor rodando na porta ${port}`);
  });
})();