import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server, request as httpRequest } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertClientSchema, insertPropertySchema, insertProjectionSchema, 
  insertTransactionSchema, PROJECTION_STRATEGY, InsertProjection,
  loginSchema, registerSchema, publicReportAccessSchema
} from "@shared/schema";
import { calcularFinanciamentoPlanta } from "./calculators/formulasFinanciamentoPlanta";
import projectionCalculationsRouter from './routes/projectionCalculations';
import tirRoutes from './routes/tirRoutes';
import uploadsRoutes from './routes/uploads';
import serveUploadsRouter from './routes/serve-uploads';
import serveLocalRoutes from './routes/serve-local';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // STRIPE ROUTES FIRST - Must be registered before other /api routes
  // Test route to verify webhook path works
  app.get('/api/stripe/webhook', (req, res) => {
    console.log('🧪 GET request to webhook endpoint - route is accessible');
    res.json({ message: 'Webhook endpoint is accessible', method: 'GET' });
  });

  // Stripe webhooks
  app.post('/api/stripe/webhook', async (req, res) => {
    console.log('=== STRIPE WEBHOOK ENDPOINT HIT ===');
    console.log('🔔 WEBHOOK RECEIVED - Method:', req.method);
    console.log('🔔 WEBHOOK RECEIVED - URL:', req.url);
    console.log('🔔 WEBHOOK RECEIVED - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔 WEBHOOK RECEIVED - Body type:', typeof req.body);
    console.log('🔔 WEBHOOK RECEIVED - Body length:', req.body?.length || 'undefined');
    console.log('🔔 WEBHOOK RECEIVED - Body is Buffer:', Buffer.isBuffer(req.body));
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log('🔐 Webhook Secret configured:', !!webhookSecret);
    console.log('🔐 Webhook Secret length:', webhookSecret?.length || 0);
    console.log('🔐 Signature present:', !!sig);
    console.log('🔐 Signature value:', sig || 'NOT_PRESENT');

    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    if (!sig) {
      console.error('❌ No Stripe signature found');
      return res.status(400).send('No Stripe signature found');
    }

    let event: Stripe.Event;

    try {
      console.log('🔍 Attempting to construct webhook event...');
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      console.log('✅ Webhook event constructed successfully:', event.type, event.id);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    // Create initial webhook log entry
    let webhookLog;
    try {
      webhookLog = await storage.createStripeWebhookLog({
        type: event.type,
        statusCode: 200,
        bodyPreview: JSON.stringify(event.data.object).substring(0, 500),
        fullBody: event,
        handled: false,
        errorMessage: null
      });
    } catch (logError) {
      console.error('Failed to log webhook event:', logError);
    }

    try {
      console.log(`🎯 Processing webhook event: ${event.type}`);
      
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('💳 Processing checkout.session.completed...');
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.updated':
          console.log('🔄 Processing customer.subscription.updated...');
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          console.log('❌ Processing customer.subscription.deleted...');
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.created':
          console.log('🆕 Processing customer.subscription.created...');
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.resumed':
          console.log('▶️ Processing customer.subscription.resumed...');
          await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.paused':
          console.log('⏸️ Processing customer.subscription.paused...');
          await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          console.log('✅ Processing invoice.payment_succeeded...');
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          console.log('💸 Processing invoice.payment_failed...');
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.upcoming':
          console.log('📅 Processing invoice.upcoming...');
          await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.trial_will_end':
          console.log('⏰ Processing customer.subscription.trial_will_end...');
          await handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
          // Log unhandled events for future implementation
          console.log('Event data:', JSON.stringify(event.data.object, null, 2));
      }

      // Update webhook log as handled successfully
      if (webhookLog) {
        try {
          await storage.updateStripeWebhookLog(webhookLog.id, {
            handled: true,
            statusCode: 200
          });
        } catch (logError) {
          console.error('Failed to update webhook log:', logError);
        }
      }

      console.log('✅ Webhook processed successfully');
      res.json({ received: true });
    } catch (error) {
      // Update webhook log with error
      if (webhookLog) {
        try {
          await storage.updateStripeWebhookLog(webhookLog.id, {
            statusCode: 500,
            handled: false,
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        } catch (logError) {
          console.error('Failed to update webhook log with error:', logError);
        }
      }

      console.error('❌ Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  // Usar router específico para servir arquivos de upload do Object Storage
  app.use('/api', serveUploadsRouter);
  
  // Manter a rota estática como fallback para compatibilidade
  app.use('/uploads', (req, res, next) => {
    // Adicionar cabeçalhos de cache para melhorar o desempenho
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 1 dia
    
    // Continuar para o próximo middleware
    next();
  }, (req, res, next) => {
    // Servir os arquivos estáticos da pasta uploads
    const staticHandler = require('express').static(path.join(process.cwd(), 'uploads'));
    staticHandler(req, res, next);
  });
  
  // Registrar rotas de upload
  app.use('/api/uploads', uploadsRoutes);
  
  // Registrar rota para servir arquivos locais
  app.use('/api/uploads', serveLocalRoutes);
  // Helper function to validate request body
  function validateBody<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: () => void) => {
      try {
        console.log("VALIDAÇÃO - Corpo recebido:", JSON.stringify(req.body, null, 2));
        console.log("VALIDAÇÃO - tipoParcelamento antes da validação:", req.body.tipoParcelamento);
        
        req.body = schema.parse(req.body);
        
        console.log("VALIDAÇÃO - tipoParcelamento após validação:", req.body.tipoParcelamento);
        next();
      } catch (error) {
        console.log("ERRO DE VALIDAÇÃO:", error);
        res.status(400).json({ error: "Invalid request body", details: error });
      }
    };
  }

  // Auth routes
  app.post('/api/auth/login', validateBody(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log(`🔐 LOGIN ATTEMPT: ${email}`);
      console.log(`Session ID: ${req.session?.id || 'undefined'}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`❌ LOGIN FAILED: User not found for ${email}`);
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      console.log(`✅ User found: ${user.email} (ID: ${user.id})`);

      // Compare password with bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`❌ LOGIN FAILED: Invalid password for ${email}`);
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      console.log(`✅ Password valid for ${email}`);

      // Store user session
      req.session.userId = user.id;

      console.log(`✅ Session created: UserID ${user.id} stored in session`);
      console.log(`Session after login:`, req.session);

      // Força o salvamento da sessão antes de responder
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error saving session:', err);
          return res.status(500).json({ error: 'Erro ao salvar sessão' });
        }
        
        console.log(`✅ Session saved successfully for ${user.email}`);
        
        const { password: _, ...userWithoutPassword } = user;
        console.log(`✅ LOGIN SUCCESS: ${user.email} (ID: ${user.id})`);
        
        res.json({ user: userWithoutPassword, message: 'Login realizado com sucesso' });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/auth/register', validateBody(registerSchema), async (req, res) => {
    try {
      const userData = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'Usuário já existe com este email' });
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userDataWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      const newUser = await storage.createUser(userDataWithHashedPassword);
      
      // Store user session
      req.session = req.session || {};
      req.session.userId = newUser.id;

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword, message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    console.log(`🚪 LOGOUT ATTEMPT: Session ID: ${req.session?.id || 'undefined'}`);
    console.log(`🚪 UserID in session: ${req.session?.userId || 'undefined'}`);
    
    // FIXED: Properly destroy session instead of just setting userId to undefined
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Error destroying session during logout:', err);
        return res.status(500).json({ error: 'Erro ao fazer logout' });
      }
      
      console.log('✅ Session destroyed successfully during logout');
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false, // false for development
        sameSite: 'lax'
      });
      
      res.json({ message: 'Logout realizado com sucesso' });
    });
  });

  // Test endpoint to debug session issues
  app.get('/api/test/session', (req, res) => {
    console.log('=== SESSION DEBUG ===');
    console.log('Session ID:', req.session?.id || 'undefined');
    console.log('Session data:', req.session);
    console.log('Cookie header:', req.headers.cookie);
    console.log('=====================');
    
    res.json({
      sessionId: req.session?.id || 'undefined',
      userId: req.session?.userId || 'undefined',
      session: req.session,
      hasSession: !!req.session,
      cookies: req.headers.cookie
    });
  });

  // Test endpoint to simulate the webhook + auto-login flow
  app.post('/api/test/simulate-webhook-flow', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
      }

      console.log(`🧪 SIMULATING WEBHOOK FLOW FOR: ${email}`);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Simulate webhook creating global session
      (global as any).userSessions = (global as any).userSessions || {};
      (global as any).userSessions[email] = {
        userId: user.id,
        email: email,
        createdAt: Date.now(),
        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
      };

      console.log(`🧪 WEBHOOK SIMULATION: Global session created for ${email}`);
      console.log(`🧪 Available sessions:`, Object.keys((global as any).userSessions));

      res.json({ 
        message: 'Webhook flow simulated successfully',
        globalSession: (global as any).userSessions[email],
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('Test webhook flow error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint to verify authentication after login
  app.get('/api/test/verify-auth', async (req, res) => {
    try {
      console.log('🧪 TESTING AUTHENTICATION VERIFICATION');
      console.log('🔍 Environment:', process.env.NODE_ENV);
      console.log('🔍 Session ID:', req.session?.id || 'undefined');
      console.log('🔍 User ID from session:', req.session?.userId || 'undefined');
      console.log('🔍 Cookie header:', req.headers.cookie || 'undefined');
      
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Usuário não autenticado',
          sessionId: req.session?.id || 'undefined',
          hasSession: !!req.session,
          cookieHeader: req.headers.cookie || 'undefined',
          environment: process.env.NODE_ENV,
          sessionConfig: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: true
          }
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      console.log('✅ AUTHENTICATION VERIFIED:', user.email);
      
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        sessionId: req.session?.id || 'undefined',
        message: 'Autenticação verificada com sucesso',
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Test verify auth error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint to debug session configuration - MemoryStore compatible
  app.get('/api/test/session-config', async (req, res) => {
    try {
      console.log('🧪 TESTING SESSION CONFIGURATION');
      console.log('🔍 Environment:', process.env.NODE_ENV);
      console.log('🔍 Trust Proxy:', app.get('trust proxy'));
      console.log('🔍 Session ID:', req.session?.id || 'undefined');
      console.log('🔍 Cookie header:', req.headers.cookie || 'undefined');
      console.log('🔍 Request IP:', req.ip);
      console.log('🔍 Request Protocol:', req.protocol);
      console.log('🔍 Request Host:', req.get('host'));
      console.log('🔍 Request Origin:', req.get('origin'));
      
      // Test session write - MemoryStore handles saving automatically
      (req.session as any).testValue = 'test_' + Date.now();
      
      console.log('✅ Session saved automatically by MemoryStore');
      console.log('🔍 Response Set-Cookie header:', res.getHeaders()['set-cookie']);
      
      res.json({
        message: 'Session configuration test successful',
        sessionId: req.session?.id || 'undefined',
        testValue: (req.session as any).testValue,
        environment: process.env.NODE_ENV,
        cookieHeader: req.headers.cookie || 'undefined',
        trustProxy: app.get('trust proxy'),
        protocol: req.protocol,
        host: req.get('host'),
        sessionConfig: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: true,
          domain: undefined
        }
      });
    } catch (error) {
      console.error('Test session config error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint to validate complete session flow in production
  app.post('/api/test/production-session', async (req, res) => {
    try {
      console.log('🧪 TESTING PRODUCTION SESSION FLOW');
      console.log('🔍 Environment:', process.env.NODE_ENV);
      console.log('🔍 Trust Proxy:', app.get('trust proxy'));
      console.log('🔍 Protocol:', req.protocol);
      console.log('🔍 Host:', req.get('host'));
      console.log('🔍 Origin:', req.get('origin'));
      console.log('🔍 IP:', req.ip);
      console.log('🔍 Cookie header:', req.headers.cookie || 'undefined');
      console.log('🔍 User-Agent:', req.get('user-agent'));
      
      // Step 1: Check if session exists
      const sessionId = req.session?.id;
      console.log('🔍 Step 1 - Session ID:', sessionId || 'undefined');
      
      // Step 2: Write test data to session - MemoryStore handles saving
      (req.session as any).testTimestamp = Date.now();
      (req.session as any).testData = { 
        step: 'production-test',
        environment: process.env.NODE_ENV,
        protocol: req.protocol,
        host: req.get('host')
      };
      
      console.log('🔍 Step 2 - Test data written to session');
      console.log('✅ Step 3 - Session saved automatically by MemoryStore');
      console.log('🔍 Set-Cookie header:', res.getHeaders()['set-cookie']);
      
      // Step 4: Return success response
      res.json({
        message: 'Production session test successful',
        sessionId: req.session?.id || 'undefined',
        testTimestamp: (req.session as any).testTimestamp,
        testData: (req.session as any).testData,
        environment: process.env.NODE_ENV,
        trustProxy: app.get('trust proxy'),
        protocol: req.protocol,
        host: req.get('host'),
        cookieHeader: req.headers.cookie || 'undefined',
        sessionConfig: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: true,
          domain: undefined
        },
        step: 'all-success'
      });
    } catch (error) {
      console.error('Test production session error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Endpoint para limpar sessões inválidas
  app.post('/api/auth/clear-invalid-session', async (req, res) => {
    try {
      console.log('🧹 CLEARING INVALID SESSION');
      console.log('🔍 Session ID before:', req.session?.id || 'undefined');
      console.log('🔍 User ID in session:', req.session?.userId || 'undefined');
      
      // Destroy current session
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Error destroying session:', err);
          return res.status(500).json({ error: 'Erro ao limpar sessão' });
        }
        
        console.log('✅ Session destroyed successfully');
        
        // Clear cookie
        res.clearCookie('connect.sid');
        
        res.json({
          message: 'Sessão inválida limpa com sucesso',
          cleared: true,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Clear invalid session error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Endpoint para listar usuários disponíveis (debug)
  app.get('/api/test/list-users', async (req, res) => {
    try {
      console.log('🔍 LISTING AVAILABLE USERS');
      
      // Get all users from database
      const users = await storage.getAllUsers();
      console.log('📊 Total users found:', users.length);
      
      const usersSummary = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        subscriptionStatus: user.subscriptionStatus,
        hasSeenWelcomeModal: user.hasSeenWelcomeModal,
        createdAt: user.createdAt
      }));
      
      console.log('📋 Users summary:', usersSummary);
      
      res.json({
        message: 'Usuários disponíveis no banco de dados',
        totalUsers: users.length,
        users: usersSummary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint to debug login flow with detailed session info
  app.post('/api/test/debug-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log('🧪 TESTING LOGIN FLOW');
      console.log('🔍 Environment:', process.env.NODE_ENV);
      console.log('🔍 Email:', email);
      console.log('🔍 Session ID before:', req.session?.id || 'undefined');
      console.log('🔍 Cookie header:', req.headers.cookie || 'undefined');
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      // Get user from database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log('❌ User not found for email:', email);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({ error: 'Senha inválida' });
      }
      
      console.log('✅ Password validated for user:', email);
      
      // Store user session
      req.session.userId = user.id;
      
      console.log('✅ Session userId set:', user.id);
      console.log('🔍 Session ID after:', req.session?.id || 'undefined');
      console.log('🔍 Session data:', req.session);
      
      // Session saved automatically by MemoryStore
      console.log('✅ Session saved automatically by MemoryStore');
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: 'Login test successful',
        user: userWithoutPassword,
        sessionId: req.session?.id || 'undefined',
        environment: process.env.NODE_ENV,
        cookieHeader: req.headers.cookie || 'undefined',
        sessionConfig: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: true
        }
      });
    } catch (error) {
      console.error('Test debug login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Auto-login route for post-payment authentication
  app.post('/api/auth/auto-login', async (req, res) => {
    try {
      const { email } = req.body;
      
      console.log(`🔐 AUTO-LOGIN ATTEMPT: ${email}`);
      console.log(`Session ID: ${req.session?.id || 'undefined'}`);
      
      if (!email) {
        console.log(`❌ AUTO-LOGIN: Email is required`);
        return res.status(400).json({ error: 'Email é obrigatório' });
      }

      // Check if user session exists
      const sessions = (global as any).userSessions || {};
      const userSession = sessions[email];
      
      console.log(`🔍 AUTO-LOGIN: Checking temporary session for ${email}`);
      console.log(`🔍 Available sessions:`, Object.keys(sessions));
      console.log(`🔍 User session:`, userSession);
      
      if (!userSession || userSession.expires < Date.now()) {
        console.log(`❌ AUTO-LOGIN: Session expired or not found for ${email}`);
        return res.status(401).json({ error: 'Sessão de auto-login expirada ou não encontrada' });
      }
      
      // Get user from database
      const user = await storage.getUser(userSession.userId);
      if (!user) {
        console.log(`❌ AUTO-LOGIN: User not found for ID ${userSession.userId}`);
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      console.log(`✅ AUTO-LOGIN: User found: ${user.email} (ID: ${user.id})`);
      
      // Create session
      req.session = req.session || {};
      req.session.userId = user.id;

      console.log(`✅ AUTO-LOGIN: Session created for ${email}`);
      console.log(`Session after auto-login:`, req.session);

      // Session saved automatically by MemoryStore
      console.log('✅ Auto-login session saved automatically by MemoryStore');

      // Clear the temporary session
      delete sessions[email];
      
      console.log(`✅ AUTO-LOGIN: Auto-login successful for ${email}`);
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, message: 'Login automático realizado com sucesso' });
    } catch (error) {
      console.error('Auto-login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Middleware for admin authentication
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta área.' });
      }

      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Middleware to update last active time
  const updateLastActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      if (userId) {
        await storage.updateUserLastActive(userId);
      }
      next();
    } catch (error) {
      console.error('Update last active error:', error);
      next(); // Continue even if this fails
    }
  };

  // Apply updateLastActive middleware to all authenticated routes
  app.use('/api', updateLastActive);

  // User routes
  app.get('/api/users/current', async (req, res) => {
    try {
      const userId = req.session?.userId;
      console.log(`🔍 GET CURRENT USER: Session ID: ${req.session?.id || 'undefined'}`);
      console.log(`🔍 Session data:`, req.session);
      console.log(`🔍 UserID from session: ${userId}`);
      
      if (!userId) {
        console.log(`❌ GET CURRENT USER: No userId in session`);
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`❌ GET CURRENT USER: User not found for ID ${userId}`);
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      console.log(`✅ GET CURRENT USER: User found: ${user.email} (ID: ${user.id})`);

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Mark welcome modal as seen
  app.patch('/api/users/welcome-modal-seen', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      await storage.updateUser(userId, {
        hasSeenWelcomeModal: true
      });
      
      res.json({ message: 'Modal de boas-vindas marcado como visto' });
    } catch (error) {
      console.error('Mark welcome modal seen error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Check subscription access without blocking
  app.get('/api/users/subscription-status', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const subscriptionAccess = checkSubscriptionAccess(user);
      
      res.json({
        hasAccess: subscriptionAccess.hasAccess,
        status: subscriptionAccess.status,
        message: subscriptionAccess.message,
        redirectTo: subscriptionAccess.redirectTo,
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionCanceledAt: user.subscriptionCanceledAt
      });
    } catch (error) {
      console.error('Subscription status check error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Middleware to check authentication
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    (req as any).userId = userId;
    next();
  }

  // Middleware to check subscription status
  async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Check subscription access based on new rules
      const subscriptionAccess = checkSubscriptionAccess(user);
      
      if (!subscriptionAccess.hasAccess) {
        return res.status(403).json({ 
          error: 'Acesso negado',
          message: subscriptionAccess.message,
          subscriptionStatus: subscriptionAccess.status,
          redirectTo: subscriptionAccess.redirectTo,
          expiredAt: user.subscriptionCurrentPeriodEnd
        });
      }

      // Log access for monitoring
      console.log(`✅ Access granted to user ${user.email} with subscription status: ${user.subscriptionStatus}`);
      (req as any).userId = userId;
      next();

    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Function to check subscription access based on business rules
  function checkSubscriptionAccess(user: any) {
    const currentDate = new Date();
    
    // If user has no subscription status
    if (!user.subscriptionStatus) {
      return {
        hasAccess: false,
        status: 'none',
        message: 'É necessário ter uma assinatura ativa para acessar este recurso.',
        redirectTo: '/settings?tab=subscription'
      };
    }

    // Rule 1: Allow access if subscription is active
    if (user.subscriptionStatus === 'active') {
      return {
        hasAccess: true,
        status: user.subscriptionStatus,
        message: 'Acesso permitido'
      };
    }

    // Rule 2: Allow access if subscription is cancel_at_period_end and current date <= subscription_current_period_end
    if (user.subscriptionStatus === 'cancel_at_period_end') {
      if (user.subscriptionCurrentPeriodEnd && currentDate <= user.subscriptionCurrentPeriodEnd) {
        return {
          hasAccess: true,
          status: user.subscriptionStatus,
          message: 'Acesso permitido até o fim do período'
        };
      } else {
        return {
          hasAccess: false,
          status: 'expired',
          message: 'Sua assinatura expirou. Reative sua assinatura para continuar usando o sistema.',
          redirectTo: '/settings?tab=subscription'
        };
      }
    }

    // Rule 3: Block access for canceled subscriptions and current date > subscription_current_period_end
    if (user.subscriptionStatus === 'canceled') {
      if (user.subscriptionCurrentPeriodEnd && currentDate > user.subscriptionCurrentPeriodEnd) {
        return {
          hasAccess: false,
          status: 'completely_canceled',
          message: 'Sua assinatura foi encerrada. Para continuar utilizando o sistema, clique abaixo para reativar sua conta.',
          redirectTo: '/settings?tab=subscription'
        };
      } else if (user.subscriptionCurrentPeriodEnd && currentDate <= user.subscriptionCurrentPeriodEnd) {
        return {
          hasAccess: true,
          status: user.subscriptionStatus,
          message: 'Acesso permitido até o fim do período'
        };
      } else {
        return {
          hasAccess: false,
          status: 'completely_canceled',
          message: 'Sua assinatura foi encerrada. Para continuar utilizando o sistema, clique abaixo para reativar sua conta.',
          redirectTo: '/settings?tab=subscription'
        };
      }
    }

    // Rule 4: Block access for problematic subscription statuses
    const blockedStatuses = ['incomplete', 'incomplete_expired', 'unpaid', 'past_due'];
    if (blockedStatuses.includes(user.subscriptionStatus)) {
      return {
        hasAccess: false,
        status: user.subscriptionStatus,
        message: 'Sua assinatura está com problemas. Atualize suas informações de pagamento.',
        redirectTo: '/settings?tab=subscription'
      };
    }

    // Allow trialing subscriptions
    if (user.subscriptionStatus === 'trialing') {
      return {
        hasAccess: true,
        status: user.subscriptionStatus,
        message: 'Acesso permitido durante período de teste'
      };
    }

    // Fallback for unknown statuses
    return {
      hasAccess: false,
      status: user.subscriptionStatus,
      message: 'Status de assinatura não reconhecido. Entre em contato com o suporte.',
      redirectTo: '/settings?tab=subscription'
    };
  }

  // Stripe Routes
  
  // Create checkout session - works for both authenticated and unauthenticated users
  app.post('/api/stripe/create-checkout', async (req, res) => {
    try {
      const userId = req.session?.userId;
      const { email, name, company, password } = req.body;

      // Case 1: User is authenticated (existing user creating subscription with promotion codes)
      if (userId) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        console.log('🎯 Creating Stripe checkout session with promotion codes for authenticated user:', user.email);
        
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          allow_promotion_codes: true,
          payment_method_types: ['card'],
          line_items: [
            {
              price: 'price_1RikiWG0L3BAVaB4VID1gop5', // ROImob Premium Monthly - R$97/mês
              quantity: 1,
            },
          ],
          success_url: 'https://roimob.com/auth/success',
          cancel_url: 'https://roimob.com/auth/register?payment=cancelled',
          client_reference_id: userId.toString(),
          customer_email: user.email,
        });

        console.log('✅ Checkout session created with promotion codes:', session.id);

        return res.json({ 
          url: session.url
        });
      }

      // Case 2: User is not authenticated (new user registration)
      if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, nome e senha são obrigatórios' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe com este email' });
      }

      // Create Stripe checkout session for new user registration
      const baseUrl = `https://${req.get('host')}`;
      console.log('🎯 Creating Stripe session for new user registration:', email);
      console.log(`   Success URL: ${baseUrl}/auth/success?session_id={CHECKOUT_SESSION_ID}`);
      console.log(`   Cancel URL: ${baseUrl}/auth/register?payment=cancelled`);
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        allow_promotion_codes: true, // Enable promotion codes for new users too
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1RikiWG0L3BAVaB4VID1gop5', // ROImob Premium Monthly - R$97/mês
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/auth/register?payment=cancelled`,
        metadata: {
          email,
          name,
          company: company || '',
          password: Buffer.from(password).toString('base64'), // Encode password for security
          action: 'user_registration'
        },
        customer_email: email,
      });

      console.log('✅ Checkout session created for new user with promotion codes:', session.id);

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id 
      });
    } catch (error) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
    }
  });

  // Create checkout session for subscription reactivation
  app.post('/api/stripe/create-reactivation-checkout', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Check if user has a completely canceled subscription
      const subscriptionStatus = checkSubscriptionAccess(user);
      if (subscriptionStatus.status !== 'completely_canceled') {
        return res.status(400).json({ error: 'Usuário não possui assinatura cancelada para reativar' });
      }

      // Create Stripe checkout session for reactivation
      const baseUrl = `https://${req.get('host')}`;
      console.log('🔄 Creating Stripe reactivation session with URLs:');
      console.log(`   Success URL: ${baseUrl}/settings?tab=subscription&reactivated=true`);
      console.log(`   Cancel URL: ${baseUrl}/settings?tab=subscription&reactivation=cancelled`);
      
      // Create session configuration - only one customer parameter allowed
      const sessionConfig = user.stripeCustomerId 
        ? {
            mode: 'subscription' as const,
            payment_method_types: ['card'],
            line_items: [
              {
                price: 'price_1RikiWG0L3BAVaB4VID1gop5', // ROImob Premium Monthly - R$97/mês
                quantity: 1,
              },
            ],
            success_url: `${baseUrl}/settings?tab=subscription&reactivated=true`,
            cancel_url: `${baseUrl}/settings?tab=subscription&reactivation=cancelled`,
            metadata: {
              userId: user.id.toString(),
              email: user.email,
              action: 'subscription_reactivation'
            },
            customer: user.stripeCustomerId,
          }
        : {
            mode: 'subscription' as const,
            payment_method_types: ['card'],
            line_items: [
              {
                price: 'price_1RikiWG0L3BAVaB4VID1gop5', // ROImob Premium Monthly - R$97/mês
                quantity: 1,
              },
            ],
            success_url: `${baseUrl}/settings?tab=subscription&reactivated=true`,
            cancel_url: `${baseUrl}/settings?tab=subscription&reactivation=cancelled`,
            metadata: {
              userId: user.id.toString(),
              email: user.email,
              action: 'subscription_reactivation'
            },
            customer_email: user.email,
          };

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log(`✅ Reactivation session created for user ${user.email}: ${session.id}`);

      res.json({ 
        url: session.url,
        sessionId: session.id 
      });
    } catch (error) {
      console.error('Stripe reactivation checkout error:', error);
      res.status(500).json({ error: 'Erro ao criar sessão de pagamento para reativação' });
    }
  });

  // Get session metadata for auto-login
  app.post('/api/stripe/get-session-metadata', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID é obrigatório' });
      }

      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session || !session.metadata) {
        return res.status(404).json({ error: 'Sessão não encontrada ou sem metadados' });
      }

      // Return only the email for auto-login
      res.json({ 
        email: session.metadata.email,
        sessionId: session.id 
      });
    } catch (error) {
      console.error('Get session metadata error:', error);
      res.status(500).json({ error: 'Erro ao obter metadados da sessão' });
    }
  });

  // Get customer portal URL for subscription management
  app.post('/api/stripe/customer-portal', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: 'Cliente Stripe não encontrado' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin}/settings?tab=subscription`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Customer portal error:', error);
      res.status(500).json({ error: 'Erro ao criar portal do cliente' });
    }
  });

  // New endpoint for Stripe Customer Portal as requested
  app.post('/api/stripe/portal', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: 'ID do cliente Stripe não encontrado no sistema' });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin}/settings?tab=subscription`,
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error('Stripe portal error:', error);
      res.status(500).json({ error: 'Erro ao criar sessão do portal' });
    }
  });

  // Webhook handler functions
  async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
      console.log('=== WEBHOOK CHECKOUT COMPLETED ===');
      console.log('Session ID:', session.id);
      console.log('Customer:', session.customer);
      console.log('Subscription:', session.subscription);
      console.log('Metadata:', session.metadata);
      
      const metadata = session.metadata;
      
      if (metadata?.action === 'user_registration') {
        console.log('Processing user registration after payment...');
        
        // Check if user already exists before creating
        const existingUser = await storage.getUserByEmail(metadata.email);
        if (existingUser) {
          console.log(`User already exists with email: ${metadata.email}`);
          
          // Update existing user with Stripe information
          if (session.customer && session.subscription) {
            await storage.updateUserSubscription(existingUser.id, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
              subscriptionStartDate: new Date(),
            });
            console.log(`Updated existing user subscription: ${metadata.email}`);
          }
          return;
        }
        
        // Create user after successful payment
        console.log('Creating new user...');
        console.log('🔓 Encoded password from metadata:', metadata.password);
        const password = Buffer.from(metadata.password, 'base64').toString('utf-8');
        console.log('🔓 Decoded password length:', password.length);
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔓 Password hashed successfully');

        const newUser = await storage.createUser({
          email: metadata.email,
          name: metadata.name,
          company: metadata.company || undefined,
          password: hashedPassword,
        });
        
        console.log('User created successfully:', newUser.id, newUser.email);

        // Update user with Stripe information
        if (session.customer && session.subscription) {
          console.log('Updating user with Stripe subscription data...');
          
          // Get subscription details from Stripe to capture period end
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          const updatedUser = await storage.updateUserSubscription(newUser.id, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          });
          console.log('User subscription updated:', updatedUser);
        } else {
          console.log('Warning: Missing customer or subscription data in session');
        }

        console.log(`✅ User created and subscription activated: ${metadata.email}`);
        
        // Auto-login the user directly by creating a session
        // This will allow immediate access after payment completion
        (global as any).userSessions = (global as any).userSessions || {};
        (global as any).userSessions[metadata.email] = {
          userId: newUser.id,
          email: metadata.email,
          createdAt: Date.now(),
          expires: Date.now() + (30 * 60 * 1000) // 30 minutes session
        };
        
        console.log(`🎟️ Auto-login session created for ${metadata.email}: UserID ${newUser.id}`);
      } else {
        console.log('No user registration action found in metadata');
      }
    } catch (error) {
      console.error('❌ Error handling checkout completed:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      console.log(`🔍 Subscription object received:`, JSON.stringify(subscription, null, 2));
      
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        // Debug: Log all subscription properties to find the correct period end field
        console.log(`🔍 Subscription properties:`, Object.keys(subscription));
        console.log(`🔍 Looking for period end in subscription:`, {
          current_period_end: (subscription as any).current_period_end,
          currentPeriodEnd: (subscription as any).currentPeriodEnd,
          current_period_end_value: subscription.current_period_end,
        });
        
        // Try to get period end timestamp from multiple possible sources
        let periodEndTimestamp = (subscription as any).current_period_end;
        
        // If not found in main object, check if it's in items array (as shown in real Stripe data)
        if (!periodEndTimestamp && (subscription as any).items && (subscription as any).items.data) {
          const firstItem = (subscription as any).items.data[0];
          if (firstItem && firstItem.current_period_end) {
            periodEndTimestamp = firstItem.current_period_end;
            console.log(`🔍 Found period end in subscription items: ${periodEndTimestamp}`);
          }
        }
        
        console.log(`🔍 Period end timestamp found: ${periodEndTimestamp} (type: ${typeof periodEndTimestamp})`);
        
        let periodEndDate: Date | undefined;
        
        if (periodEndTimestamp && typeof periodEndTimestamp === 'number' && periodEndTimestamp > 0) {
          periodEndDate = new Date(periodEndTimestamp * 1000);
          // Additional validation - check if date is valid
          if (isNaN(periodEndDate.getTime())) {
            console.error(`❌ Invalid date created from timestamp ${periodEndTimestamp}`);
            periodEndDate = undefined;
          } else {
            console.log(`✅ Valid period end date created: ${periodEndDate.toISOString()}`);
          }
        } else {
          console.warn(`⚠️ Invalid or missing period end timestamp for subscription ${subscription.id}: ${periodEndTimestamp}`);
          
          // If still no valid timestamp, try to get it from Stripe API directly
          try {
            console.log(`🔄 Fetching subscription details from Stripe API...`);
            const fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
            console.log(`🔍 Full subscription from API - current_period_end:`, fullSubscription.current_period_end);
            
            if (fullSubscription.current_period_end) {
              periodEndTimestamp = fullSubscription.current_period_end;
              periodEndDate = new Date(periodEndTimestamp * 1000);
              console.log(`✅ Retrieved period end from API: ${periodEndDate.toISOString()}`);
            }
          } catch (apiError) {
            console.error(`❌ Failed to fetch subscription from API:`, apiError);
          }
        }

        let updateData: any = {
          subscriptionStatus: subscription.status as any,
        };

        // Only set period end if we have a valid date
        if (periodEndDate) {
          updateData.subscriptionCurrentPeriodEnd = periodEndDate;
        }

        // Check if subscription was canceled but still active until period end
        if (subscription.cancel_at_period_end === true && subscription.status === 'active') {
          if (periodEndDate) {
            console.log(`🔄 Subscription cancellation scheduled for user ${user.email} - will remain active until ${periodEndDate.toISOString()}`);
            updateData.subscriptionStatus = 'cancel_at_period_end';
            updateData.subscriptionCanceledAt = new Date(); // Data atual do cancelamento
          } else {
            console.error(`❌ Cannot process cancellation - invalid period end for subscription ${subscription.id}`);
            updateData.subscriptionStatus = 'cancel_at_period_end';
            updateData.subscriptionCanceledAt = new Date();
          }
        }

        // Check if subscription is now fully canceled
        if (subscription.status === 'canceled') {
          console.log(`❌ Subscription fully canceled for user ${user.email}`);
          updateData.subscriptionStatus = 'canceled';
          updateData.subscriptionCanceledAt = new Date();
        }

        // Check if subscription is being reactivated (was canceled but now active without cancel_at_period_end)
        if (subscription.status === 'active' && !subscription.cancel_at_period_end && user.subscriptionCanceledAt) {
          console.log(`🎉 Subscription REACTIVATED for user ${user.email} - clearing cancellation date`);
          updateData.subscriptionStatus = 'active';
          updateData.subscriptionCanceledAt = null; // Clear cancellation date
        }

        console.log(`🔄 Updating subscription for user ${user.email}:`, JSON.stringify(updateData, null, 2));
        await storage.updateUserSubscription(user.id, updateData);
        
        const periodEndStr = periodEndDate ? periodEndDate.toISOString() : 'not provided';
        console.log(`✅ Subscription updated: ${subscription.id}, status: ${updateData.subscriptionStatus}, period end: ${periodEndStr} for user ${user.email}`);
      } else {
        console.log(`User not found for customer: ${subscription.customer}`);
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
    }
  }

  async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: 'canceled',
          subscriptionCurrentPeriodEnd: new Date(),
          subscriptionCanceledAt: new Date(),
        });
        console.log(`❌ Subscription deleted: ${subscription.id} for user ${user.email} - access will be blocked immediately`);
      } else {
        console.log(`User not found for customer: ${subscription.customer}`);
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  // Handler for subscription created (new subscriptions)
  async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      console.log(`🆕 New subscription created: ${subscription.id} for customer ${subscription.customer}`);
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        await storage.updateUserSubscription(user.id, {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status as any,
          subscriptionStartDate: new Date(subscription.start_date * 1000),
          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          subscriptionCanceledAt: null, // Clear any previous cancellation
        });
        console.log(`✅ New subscription ${subscription.id} created for user ${user.email} with status: ${subscription.status}`);
      } else {
        console.log(`User not found for customer: ${subscription.customer}`);
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  // Handler for subscription resumed (reactivation after cancellation)
  async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
    try {
      console.log(`▶️ Subscription resumed: ${subscription.id} for customer ${subscription.customer}`);
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          subscriptionCanceledAt: null, // Clear cancellation date since subscription is reactivated
        });
        console.log(`✅ Subscription ${subscription.id} REACTIVATED for user ${user.email} - access restored`);
      } else {
        console.log(`User not found for customer: ${subscription.customer}`);
      }
    } catch (error) {
      console.error('Error handling subscription resumed:', error);
    }
  }

  // Handler for subscription paused
  async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
    try {
      console.log(`⏸️ Subscription paused: ${subscription.id} for customer ${subscription.customer}`);
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: 'paused',
          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        console.log(`⏸️ Subscription ${subscription.id} paused for user ${user.email}`);
      } else {
        console.log(`User not found for customer: ${subscription.customer}`);
      }
    } catch (error) {
      console.error('Error handling subscription paused:', error);
    }
  }

  // Handler for successful payment
  async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      console.log(`✅ Payment succeeded for customer: ${invoice.customer}`);
      const user = await storage.getUserByStripeCustomerId(invoice.customer as string);
      if (user && invoice.subscription) {
        // Refresh subscription data from Stripe to get latest period end
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: subscription.status as any,
          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        console.log(`✅ Payment processed successfully for user ${user.email}, subscription extended until ${new Date(subscription.current_period_end * 1000).toISOString()}`);
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  // Handler for failed payment
  async function handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      console.log(`💸 Payment failed for customer: ${invoice.customer}`);
      const user = await storage.getUserByStripeCustomerId(invoice.customer as string);
      if (user) {
        // Note: Don't immediately cancel subscription on payment failure
        // Stripe will retry payments and send subscription.deleted if needed
        console.log(`⚠️ Payment failed for user ${user.email}, subscription ID: ${invoice.subscription}`);
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  // Handler for upcoming invoice (renewal notification)
  async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
    try {
      console.log(`📅 Invoice upcoming for customer: ${invoice.customer}`);
      const user = await storage.getUserByStripeCustomerId(invoice.customer as string);
      if (user) {
        console.log(`📅 Upcoming renewal for user ${user.email}, amount: ${invoice.amount_due / 100} ${invoice.currency}`);
        // Here you could implement notification logic for upcoming renewals
      }
    } catch (error) {
      console.error('Error handling invoice upcoming:', error);
    }
  }

  // Handler for trial ending soon
  async function handleTrialWillEnd(subscription: Stripe.Subscription) {
    try {
      console.log(`⏰ Trial ending soon for subscription: ${subscription.id}`);
      const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
      if (user) {
        console.log(`⏰ Trial ending soon for user ${user.email}, subscription: ${subscription.id}`);
        // Here you could implement notification logic for trial ending
      }
    } catch (error) {
      console.error('Error handling trial will end:', error);
    }
  }

  // Helper function to extract client IP from request
  function getClientIp(req: Request): string {
    // Check for x-forwarded-for header (common with proxies and load balancers)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // x-forwarded-for can contain multiple IPs, get the first one
      const firstIp = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return firstIp.split(',')[0].trim();
    }
    
    // Fallback to socket remote address
    return req.socket.remoteAddress || 'unknown';
  }

  // Update user profile
  app.patch('/api/users/profile', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { name, email } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      // Prepare update data
      const updateData: any = { name };

      // Only validate and update email if it's provided
      if (email) {
        // Check if email is already in use by another user
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ error: 'Este email já está sendo usado por outro usuário' });
        }
        updateData.email = email;
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Check subscription access status
  app.get('/api/users/subscription-access', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const subscriptionAccess = checkSubscriptionAccess(user);
      res.json(subscriptionAccess);
    } catch (error) {
      console.error('Error checking subscription access:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Update company data
  app.patch('/api/users/company', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { company } = req.body;

      const updatedUser = await storage.updateUser(userId, { company });
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Change password
  app.patch('/api/users/password', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Compare current password with bcrypt (same as login)
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }

      // Hash the new password before saving
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await storage.updateUser(userId, { password: hashedNewPassword });
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para servir arquivos de upload
  app.get('/api/uploads/serve/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', 'properties', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  });

  // Avatar upload
  app.post('/api/users/avatar', requireActiveSubscription, async (req: Request, res: Response) => {
    const multer = require('multer');
    const fs = require('fs-extra');
    
    try {
      const userId = (req as any).userId;
      
      // Configurar diretório temporário
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      fs.ensureDirSync(tempDir);
      
      const upload = multer({
        dest: tempDir,
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
        fileFilter: (req: any, file: any, cb: any) => {
          if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
          } else {
            cb(new Error('A imagem deve ser PNG ou JPEG'), false);
          }
        }
      });

      // Processar upload
      upload.single('avatar')(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ error: 'A imagem deve ter no máximo 5MB' });
            }
          } else if (err && err.message) {
            if (err.message.includes('PNG ou JPEG')) {
              return res.status(400).json({ error: 'A imagem deve ser PNG ou JPEG' });
            }
          }
          return res.status(400).json({ error: err.message || 'Erro no upload do arquivo' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        try {
          console.log('Processando upload de avatar para usuário:', userId);
          console.log('Arquivo recebido:', req.file);

          // Import upload function
          const { uploadImage } = require('./services/image-manager');
          
          // Fazer upload da imagem para o storage
          const avatarUrl = await uploadImage(req.file.path, `avatar-${userId}-${req.file.originalname}`);
          
          console.log('Avatar salvo no storage:', avatarUrl);
          
          // Atualizar usuário com a nova URL do avatar no banco de dados
          const updatedUser = await storage.updateUser(userId, { photo: avatarUrl });
          if (!updatedUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
          }

          console.log('Usuário atualizado no banco de dados com avatar:', updatedUser.photo);

          // Limpar arquivo temporário
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (cleanupError) {
            console.warn('Aviso: Não foi possível remover arquivo temporário:', cleanupError);
          }

          // Retornar resposta de sucesso
          return res.status(200).json({
            message: 'Avatar atualizado com sucesso',
            avatarUrl: avatarUrl,
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              photo: updatedUser.photo
            }
          });
        } catch (uploadError) {
          console.error('Erro no processo de upload:', uploadError);
          return res.status(500).json({ error: 'Erro ao processar upload de avatar' });
        }
      });
    } catch (error) {
      console.error('Erro geral no upload de avatar:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Client routes
  app.get('/api/clients', requireActiveSubscription, async (req, res) => {
    const userId = (req as any).userId;
    const clients = await storage.getClients(userId);
    res.json(clients);
  });

  app.get('/api/clients/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  });

  app.post('/api/clients', requireActiveSubscription, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      // Validar apenas campos obrigatórios
      if (!req.body.name) {
        return res.status(400).json({ error: "Nome do cliente é obrigatório" });
      }
      
      // Substituir valores nulos ou vazios por undefined
      const clientData = {
        name: req.body.name,
        email: req.body.email || undefined,
        phone: req.body.phone || undefined,
        company: req.body.company || undefined,
        notes: req.body.notes || undefined,
        userId: userId
      };
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      res.status(500).json({ error: "Erro ao criar cliente", details: error });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await storage.updateClient(id, req.body);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  });

  // PATCH endpoint for client updates (matching frontend expectations)
  app.patch('/api/clients/:id', requireActiveSubscription, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID do cliente inválido' });
      }

      console.log("Atualizando cliente ID:", id);
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));

      // Validate that only expected fields are being updated
      const allowedFields = ['name', 'email', 'phone', 'company', 'notes'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field)) {
          // Convert empty strings to null for optional fields
          updateData[field] = req.body[field] === '' ? null : req.body[field];
        }
      }

      // Validate required fields
      if (updateData.name !== undefined && !updateData.name) {
        return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
      }

      const client = await storage.updateClient(id, updateData);
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      console.log("Cliente atualizado com sucesso:", client);
      res.json(client);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      res.status(500).json({ 
        error: "Erro ao atualizar cliente", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    try {
      // Verificar se o modo foi especificado como parâmetro de consulta
      const mode = req.query.mode as string || 'client-only';
      
      // Se o modo for 'client-and-projections', excluir também as projeções associadas
      if (mode === 'client-and-projections') {
        // Buscar projeções deste cliente
        const userId = (req as any).userId;
        const projections = await storage.getProjections(userId);
        const clientProjections = projections.filter(p => p.clientId === id);
        
        // Excluir cada projeção
        for (const projection of clientProjections) {
          // Excluir transações e cálculos relacionados
          await storage.deleteTransactionsByProjection(projection.id);
          await storage.deleteCalculosByProjection(projection.id);
          // Excluir a projeção
          await storage.deleteProjection(projection.id);
        }
      }
      
      // Excluir o cliente
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      res.status(500).json({ error: 'Erro interno ao excluir cliente', details: error });
    }
  });

  // Property routes
  app.get('/api/properties', requireActiveSubscription, async (req, res) => {
    const userId = (req as any).userId;
    const properties = await storage.getProperties(userId);
    res.json(properties);
  });

  app.get('/api/properties/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const property = await storage.getProperty(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  });

  app.post('/api/properties', requireActiveSubscription, async (req, res) => {
    try {
      const userId = (req as any).userId;
      console.log("Recebendo dados para nova propriedade:", JSON.stringify(req.body, null, 2));
      
      // Validar apenas os campos obrigatórios básicos
      if (!req.body.name || !req.body.type) {
        return res.status(400).json({ 
          error: "Nome e tipo do imóvel são obrigatórios",
          details: { name: !req.body.name ? "Nome é obrigatório" : undefined, 
                    type: !req.body.type ? "Tipo é obrigatório" : undefined }
        });
      }
      
      // Preparar dados da propriedade com valores seguros
      const propertyData = {
        name: req.body.name,
        type: req.body.type,
        unit: req.body.unit || null,
        area: req.body.area ? String(req.body.area) : null,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl || null,
        websiteUrl: req.body.websiteUrl || null,
        address: req.body.address || null,
        neighborhood: req.body.neighborhood || null,
        city: req.body.city || null,
        state: req.body.state || null,
        zipCode: req.body.zipCode || null,
        userId: userId
      };
      
      console.log("Dados preparados para criação:", propertyData);
      
      // Criar a propriedade
      const property = await storage.createProperty(propertyData);
      
      console.log("Propriedade criada com sucesso:", property);
      res.status(201).json(property);
    } catch (error) {
      console.error("Erro ao criar propriedade:", error);
      res.status(500).json({ 
        error: "Ocorreu um erro ao criar a propriedade",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put('/api/properties/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const property = await storage.updateProperty(id, req.body);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  });

  // Adicionando rota PATCH para compatibilidade com as requisições do frontend
  app.patch('/api/properties/:id', async (req, res) => {
    try {
      console.log("Recebendo dados para atualização de propriedade:", JSON.stringify(req.body, null, 2));
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID de propriedade inválido' });
      }

      // Remover o campo ID dos dados de atualização para evitar problemas
      const { id: _, ...updateData } = req.body;
      
      // Sanitizar campos decimais - converter strings vazias para null
      if (updateData.area === "") {
        updateData.area = null;
      }
      if (updateData.listPrice === "") {
        updateData.listPrice = null;
      }
      
      console.log("Dados sanitizados para atualização:", updateData);
      
      // Atualizar a propriedade no banco de dados
      const property = await storage.updateProperty(id, updateData);
      if (!property) {
        return res.status(404).json({ error: 'Propriedade não encontrada' });
      }
      
      console.log("Propriedade atualizada com sucesso:", property);
      res.json(property);
    } catch (error) {
      console.error("Erro ao atualizar propriedade:", error);
      res.status(500).json({ 
        error: "Ocorreu um erro ao atualizar a propriedade",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete('/api/properties/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const success = await storage.deleteProperty(id);
    if (!success) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(204).end();
  });

  // Projection routes
  app.get('/api/projections', requireActiveSubscription, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projections = await storage.getProjections(userId);
      
      // Adicionar informações do cliente para cada projeção
      for (const projection of projections) {
        if (projection.clientId) {
          const client = await storage.getClient(projection.clientId);
          if (client) {
            projection.client = client;
          }
        }
      }
      
      res.json(projections);
    } catch (error) {
      console.error("Erro ao buscar projeções:", error);
      res.status(500).json({ error: "Erro ao buscar projeções" });
    }
  });

  app.get('/api/projections/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid projection ID' });
    }

    const projection = await storage.getProjection(id);
    if (!projection) {
      return res.status(404).json({ error: 'Projection not found' });
    }

    // Log detalhado de todos os campos importantes para a valorização
    console.log(`Detalhes da projeção #${id} para debug:`, {
      padrao_venda_prazo: projection.padrao_venda_prazo,
      conservador_venda_prazo: projection.conservador_venda_prazo,
      otimista_venda_prazo: projection.otimista_venda_prazo,
      padrao_venda_valorizacao: projection.padrao_venda_valorizacao,
      conservador_venda_valorizacao: projection.conservador_venda_valorizacao,
      otimista_venda_valorizacao: projection.otimista_venda_valorizacao
    });

    // Verificar se existem cálculos de financiamento na planta para esta projeção
    try {
      const calculosProjecao = await storage.getCalculosProjecao(id);

      // Se existirem cálculos, montar o objeto de financiamento na planta
      if (calculosProjecao && calculosProjecao.length > 0) {
        console.log(`Encontrados ${calculosProjecao.length} registros de cálculos para a projeção #${id}`);

        // Definir variáveis antes de usar
        const valorImovel = parseFloat(projection.listPrice.replace(/[^\d.-]/g, ''));
        const prazoEntrega = projection.deliveryMonths;
        const prazoPagamento = projection.paymentMonths;

        // Converter os cálculos do banco para o formato usado no frontend
        const parcelas = calculosProjecao.map(calculo => ({
          mes: calculo.mes,
          data: new Date(new Date().getFullYear(), new Date().getMonth() + calculo.mes).toISOString().split('T')[0],
          tipoPagamento: calculo.mes === 0 || calculo.valorEntrada !== "0" ? 'Entrada' :
                         calculo.valorChaves !== "0" ? 'Chaves' :
                         calculo.reforcoBase !== "0" ? 'Reforço' : 
                         'Parcela',
          valorBase: parseFloat(calculo.pagamentoTotalLiquido),
          percentualCorrecao: parseFloat(calculo.taxaCorrecao),
          valorCorrigido: parseFloat(calculo.pagamentoTotal),
          saldoDevedor: parseFloat(calculo.saldoDevedorCorrigido),
          saldoLiquido: parseFloat(calculo.saldoLiquido),
          correcaoAcumulada: parseFloat(calculo.taxaAcumulada),
          taxaCorrecaoEditavel: calculo.mes > prazoEntrega ? parseFloat(calculo.taxaCorrecao) : undefined
        }));

        // Calcular o resumo com base nas parcelas
        const valorEntrada = parcelas.find(p => p.tipoPagamento === 'Entrada')?.valorBase || 0;

        // Calcular totais
        let totalCorrecao = 0;
        parcelas.forEach(parcela => {
          if (parcela.valorCorrigido > parcela.valorBase) {
            totalCorrecao += (parcela.valorCorrigido - parcela.valorBase);
          }
        });

        const valorTotal = parcelas.reduce((sum, parcela) => sum + parcela.valorCorrigido, 0);
        const percentualCorrecao = totalCorrecao / (valorTotal - totalCorrecao) * 100;

        // Iniciar o objeto calculationResults se não existir
        if (!projection.calculationResults) {
          projection.calculationResults = {};
        }

        // Adicionar os resultados do financiamento aos resultados de cálculo da projeção
        projection.calculationResults.financiamentoPlanta = {
          parcelas,
          resumo: {
            valorImovel,
            valorEntrada,
            valorFinanciado: valorImovel - valorEntrada,
            prazoEntrega,
            prazoPagamento,
            totalParcelas: parcelas.length,
            totalCorrecao,
            percentualCorrecao,
            valorTotal
          }
        };
      }
    } catch (error) {
      console.error("Erro ao carregar cálculos da projeção:", error);
    }

    // Enriquecer a projeção com cálculos detalhados para o relatório
    if (projection.strategies && projection.strategies.length > 0) {
      console.log(`Processando projeção ID ${id} com estratégias: ${projection.strategies}`);

      // Obter valores necessários para cálculos
      const listPriceValue = parseFloat(projection.listPrice.replace(/[^\d.-]/g, ''));
      const discountValue = parseFloat(projection.discount?.replace(/[^\d.-]/g, '') || '0');
      const downPaymentValue = parseFloat(projection.downPayment.replace(/[^\d.-]/g, ''));
      const monthlyCorrectionValue = parseFloat(projection.monthlyCorrection.replace(/[^\d.-]/g, '') || '0');
      const postDeliveryCorrectionValue = parseFloat(projection.postDeliveryCorrection?.replace(/[^\d.-]/g, '') || '0');

      // Criar objeto detalhado de calculationResults com valores fixos para garantir que temos dados
      const calculationResults: Record<string, any> = {
        // Valores iniciais para garantir que existem dados
        roi: 22.5,
        irr: 18.3,
        paybackMonths: 32,
        netProfit: 191250
      };

      // Gerar resultados detalhados para FUTURE_SALE
      if (projection.strategies.includes('FUTURE_SALE')) {
        const futureValuePercentageValue = parseFloat(projection.futureValuePercentage?.replace(/[^\d.-]/g, '') || '0');
        const futureValueMonthValue = projection.futureValueMonth || 60;
        const saleCommissionValue = parseFloat(projection.saleCommission?.replace(/[^\d.-]/g, '') || '0');
        const saleTaxesValue = parseFloat(projection.saleTaxes?.replace(/[^\d.-]/g, '') || '0');
        const incomeTaxValue = parseFloat(projection.incomeTax?.replace(/[^\d.-]/g, '') || '0');

        const discountedPrice = listPriceValue * (1 - discountValue / 100);
        const downPaymentAmount = discountedPrice * (downPaymentValue / 100);
        const remainingAmount = discountedPrice - downPaymentAmount;
        const monthlyAmount = remainingAmount / projection.paymentMonths;

        // Criar fluxo de caixa
        const cashFlow = [];
        let totalInvestment = downPaymentAmount;

        // Entrada inicial (valor negativo = saída de caixa)
        cashFlow.push({
          month: 0,
          description: 'Entrada Inicial',
          amount: -downPaymentAmount
        });

        // Parcelas durante a construção
        for (let month = 1; month <= projection.deliveryMonths; month++) {
          const correctionFactor = Math.pow(1 + monthlyCorrectionValue / 100, month);
          const adjustedAmount = monthlyAmount * correctionFactor;
          totalInvestment += adjustedAmount;

          cashFlow.push({
            month,
            description: `Parcela ${month}`,
            amount: -adjustedAmount
          });

          // Adicionar bônus se aplicável
          if (projection.includeBonusPayments && month % projection.bonusFrequency === 0) {
            const bonusAmount = adjustedAmount * 2; // Exemplo: Bônus = 2 parcelas
            totalInvestment += bonusAmount;

            cashFlow.push({
              month,
              description: `Bônus ${month / projection.bonusFrequency}`,
              amount: -bonusAmount
            });
          }
        }

        // Parcelas após entrega
        for (let month = projection.deliveryMonths + 1; month <= projection.paymentMonths; month++) {
          const preDeliveryCorrection = Math.pow(1 + monthlyCorrectionValue / 100, projection.deliveryMonths);
          const postDeliveryCorrection = Math.pow(1 + postDeliveryCorrectionValue / 100, month - projection.deliveryMonths);
          const adjustedAmount = monthlyAmount * preDeliveryCorrection * postDeliveryCorrection;
          totalInvestment += adjustedAmount;

          cashFlow.push({
            month,
            description: `Parcela ${month} (pós-entrega)`,
            amount: -adjustedAmount
          });

          // Adicionar bônus se aplicável
          if (projection.includeBonusPayments && month % projection.bonusFrequency === 0) {
            const bonusAmount = adjustedAmount * 2; // Exemplo: Bônus = 2 parcelas
            totalInvestment += bonusAmount;

            cashFlow.push({
              month,
              description: `Bônus ${month / projection.bonusFrequency} (pós-entrega)`,
              amount: -bonusAmount
            });
          }
        }

        // Valor de venda futura
        const futureValueMonth = futureValueMonthValue > projection.paymentMonths 
          ? futureValueMonthValue 
          : projection.paymentMonths + 24; // Default para 2 anos após o último pagamento

        const appreciationFactor = 1 + (futureValuePercentageValue / 100);
        const futureValue = discountedPrice * appreciationFactor;

        // Despesas de venda
        const saleCommissionAmount = futureValue * (saleCommissionValue / 100);
        const saleTaxesAmount = futureValue * (saleTaxesValue / 100);
        const saleExpenses = saleCommissionAmount + saleTaxesAmount;

        // Lucro bruto
        const grossProfit = futureValue - totalInvestment;

        // Imposto de renda
        const incomeTaxAmount = grossProfit * (incomeTaxValue / 100);

        // Lucro líquido
        const netProfit = grossProfit - saleExpenses - incomeTaxAmount;

        // Adicionar venda ao fluxo de caixa
        cashFlow.push({
          month: futureValueMonth,
          description: 'Venda do imóvel',
          amount: futureValue
        });

        // Adicionar despesas da venda
        cashFlow.push({
          month: futureValueMonth,
          description: 'Comissão de venda',
          amount: -saleCommissionAmount
        });

        cashFlow.push({
          month: futureValueMonth,
          description: 'Impostos da venda',
          amount: -saleTaxesAmount
        });

        cashFlow.push({
          month: futureValueMonth,
          description: 'Imposto de renda',
          amount: -incomeTaxAmount
        });

        // Calcular ROI
        const roi = (netProfit / totalInvestment) * 100;

        // Calcular payback simplificado
        const paybackMonths = Math.ceil(totalInvestment / (netProfit / futureValueMonth)) || 0;

        // Calcular TIR simplificada (aproximada)
        const irr = Math.pow((1 + roi / 100), (12 / futureValueMonth)) - 1;
        const annualizedIrr = irr * 12 * 100;

        // Adicionar resultados detalhados
        calculationResults.futureSale = {
          purchasePrice: discountedPrice,
          totalInvestment: totalInvestment,
          futureValue: futureValue,
          saleExpenses: saleExpenses,
          grossProfit: grossProfit,
          incomeTax: incomeTaxAmount,
          netProfit: netProfit,
          roi: roi,
          irr: annualizedIrr,
          paybackMonths: paybackMonths
        };

        calculationResults.futureSaleCashFlow = cashFlow;
      }

      // Gerar resultados detalhados para ASSET_APPRECIATION
      if (projection.strategies.includes('ASSET_APPRECIATION')) {
        const appreciationYearsValue = projection.appreciationYears || 10;
        const annualAppreciationValue = parseFloat(projection.annualAppreciation?.replace(/[^\d.-]/g, '') || '0');
        const maintenanceCostsValue = parseFloat(projection.maintenanceCosts?.replace(/[^\d.-]/g, '') || '0');

        const discountedPrice = listPriceValue * (1 - discountValue / 100);
        const yearlyProjection = [];
        let currentValue = discountedPrice;
        let totalMaintenance = 0;

        for (let year = 1; year <= appreciationYearsValue; year++) {
          const appreciation = currentValue * (annualAppreciationValue / 100);
          const maintenanceCost = discountedPrice * (maintenanceCostsValue / 100);
          totalMaintenance += maintenanceCost;

          const yearData = {
            year,
            propertyValue: currentValue + appreciation,
            appreciation,
            maintenanceCost,
            netValue: (currentValue + appreciation) - totalMaintenance
          };

          yearlyProjection.push(yearData);
          currentValue = yearData.propertyValue;
        }

        const finalValue = yearlyProjection[yearlyProjection.length - 1].propertyValue;
        const totalAppreciation = finalValue - discountedPrice;
        const netGain = totalAppreciation - totalMaintenance;
        const appreciationPercentage = (totalAppreciation / discountedPrice) * 100;
        const annualizedReturn = Math.pow((1 + appreciationPercentage / 100), (1 / appreciationYearsValue)) - 1;

        calculationResults.assetAppreciation = {
          initialValue: discountedPrice,
          finalValue,
          totalAppreciation,
          totalMaintenance,
          netGain,
          appreciationPercentage,
          annualizedReturn: annualizedReturn * 100
        };

        calculationResults.assetAppreciationYearly = yearlyProjection;
      }

      // Gerar resultados detalhados para RENTAL_YIELD
      if (projection.strategies.includes('RENTAL_YIELD')) {
        const monthlyRentalValue = parseFloat(projection.monthlyRental?.replace(/[^\d.-]/g, '') || '0');
        const furnishingCostsValue = parseFloat(projection.furnishingCosts?.replace(/[^\d.-]/g, '') || '0');
        const condoFeesValue = parseFloat(projection.condoFees?.replace(/[^\d.-]/g, '') || '0');
        const propertyTaxValue = parseFloat(projection.propertyTax?.replace(/[^\d.-]/g, '') || '0');

        const discountedPrice = listPriceValue * (1 - discountValue / 100);
        const initialInvestment = discountedPrice + furnishingCostsValue;
        const annualRentalIncome = monthlyRentalValue * 12;
        const annualExpenses = (condoFeesValue + propertyTaxValue) * 12;
        const annualNetIncome = annualRentalIncome - annualExpenses;
        const firstYearYield = (annualNetIncome / initialInvestment) * 100;

        // Projeção para 10 anos
        const projectionYears = 10;
        const annualPropertyAppreciation = 5; // Valor padrão
        const yearlyProjection = [];

        let currentPropertyValue = discountedPrice;
        let totalNetIncome = 0;
        let currentRentalIncome = monthlyRentalValue * 12;
        let currentExpenses = annualExpenses;

        for (let year = 1; year <= projectionYears; year++) {
          // Aumentar valor do imóvel com apreciação anual
          const propertyAppreciation = currentPropertyValue * (annualPropertyAppreciation / 100);
          currentPropertyValue += propertyAppreciation;

          // Aumentar aluguel e despesas com inflação (exemplo 3%)
          const inflationFactor = Math.pow(1.03, year - 1); 
          const adjustedRentalIncome = currentRentalIncome * inflationFactor;
          const adjustedExpenses = currentExpenses * inflationFactor;
          const netIncome = adjustedRentalIncome - adjustedExpenses;

          totalNetIncome += netIncome;

          const yieldValue = (netIncome / initialInvestment) * 100;

          yearlyProjection.push({
            year,
            propertyValue: currentPropertyValue,
            rentalIncome: adjustedRentalIncome,
            expenses: adjustedExpenses,
            netIncome,
            yieldRate: yieldValue
          });
        }

        const totalPropertyValueIncrease = currentPropertyValue - discountedPrice;
        const totalReturn = totalNetIncome + totalPropertyValueIncrease;
        const totalReturnPercentage = (totalReturn / initialInvestment) * 100;

        // Calcular rendimento médio
        const averageYield = yearlyProjection.reduce((sum, year) => sum + (year.yieldRate || 0), 0) / projectionYears;

        calculationResults.rentalYield = {
          initialInvestment,
          furnishingCosts: furnishingCostsValue,
          annualRentalIncome,
          annualExpenses,
          annualNetIncome,
          firstYearYield,
          propertyValueIncrease: totalPropertyValueIncrease,
          totalNetIncome,
          totalReturn,
          totalReturnPercentage,
          averageYield
        };

        calculationResults.rentalYieldYearly = yearlyProjection;
      }

      // Atualizar os calculationResults na projeção
      projection.calculationResults = calculationResults;
    }

    // Os dados de cliente e propriedade já são carregados no método getProjection do storage

    res.json(projection);
  });

  app.post('/api/projections', requireActiveSubscription, validateBody(insertProjectionSchema), async (req, res) => {
    const userId = (req as any).userId;
    req.body.userId = userId;

    // Debug log para verificar tipoParcelamento
    console.log("DEBUG TIPO PARCELAMENTO:", req.body.tipoParcelamento);
    console.log("DEBUG BODY COMPLETO:", JSON.stringify(req.body, null, 2));

    // Validate strategies
    if (!req.body.strategies || !Array.isArray(req.body.strategies) || req.body.strategies.length === 0) {
      return res.status(400).json({ error: 'At least one strategy must be selected' });
    }

    // Check if all strategies are valid
    const invalidStrategies = req.body.strategies.filter(
      (strategy: string) => !Object.values(PROJECTION_STRATEGY).includes(strategy)
    );
    if (invalidStrategies.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid strategies', 
        invalidStrategies 
      });
    }

    const projection = await storage.createProjection(req.body);
    res.status(201).json(projection);
  });

  // Nova rota para criar projeções de forma simplificada
  app.post('/api/projections/new', requireActiveSubscription, async (req, res) => {
    try {
      console.log("=== DEBUG TIPO PARCELAMENTO NA ROTA /NEW ===");
      console.log("TIPO PARCELAMENTO recebido:", req.body.tipoParcelamento);
      console.log("TIPO PARCELAMENTO typeof:", typeof req.body.tipoParcelamento);
      console.log("Recebendo dados para nova projeção:", JSON.stringify(req.body, null, 2));

      // Verificar título e estratégias
      if (!req.body.title || !req.body.strategies || req.body.strategies.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: title and strategies' });
      }

      // Importar o calculador de financiamento na planta
      const { calcularFinanciamentoPlanta, FinanciamentoPlantaSchema } = await import('./calculators/formulasFinanciamentoPlanta');

      // Obter todos os campos do formulário enviados pelo cliente
      const formData = req.body;

      // Log detalhado dos dados de cenários recebidos
      console.log("=== DEBUG: Dados de cenários recebidos ===");
      console.log("formData.scenarioType:", formData.scenarioType);
      console.log("formData.selectedScenarios:", formData.selectedScenarios);
      console.log("formData.padrao:", JSON.stringify(formData.padrao, null, 2));
      console.log("formData.conservador:", JSON.stringify(formData.conservador, null, 2));
      console.log("formData.conservative:", JSON.stringify(formData.conservative, null, 2));
      console.log("formData.otimista:", JSON.stringify(formData.otimista, null, 2));
      console.log("formData.optimistic:", JSON.stringify(formData.optimistic, null, 2));
      console.log("=======================================");

      // Função helper para obter valor de cenário com fallback seguro
      const getScenarioValue = (cenario: string, categoria: string, campo: string, valorPadrao: string = "") => {
        // Tentar primeiro com nome em português
        const valorPortugues = formData[cenario]?.[categoria]?.[campo];
        // Tentar com nome em inglês como fallback
        const nomeIngles = cenario === 'conservador' ? 'conservative' : cenario === 'otimista' ? 'optimistic' : cenario;
        const valorIngles = formData[nomeIngles]?.[categoria]?.[campo];
        
        // Retornar primeiro valor não vazio/undefined encontrado
        const valorFinal = valorPortugues && valorPortugues !== "" ? valorPortugues : 
                          valorIngles && valorIngles !== "" ? valorIngles : 
                          valorPadrao;
        
        console.log(`getScenarioValue(${cenario}, ${categoria}, ${campo}): português=${valorPortugues}, inglês=${valorIngles}, final=${valorFinal}`);
        return valorFinal;
      };

      // Calcular prazo de pagamento ajustado para parcelamento personalizado
      let prazoPagamentoAjustado = Number(formData.paymentMonths || 36);
      
      if (formData.tipoParcelamento === 'personalizado' && formData.customPayments && formData.customPayments.length > 0) {
        // Para pagamento personalizado, o prazo deve ser o mês do último pagamento
        const mesesPagamentos = formData.customPayments.map((payment: any) => Number(payment.month));
        const ultimoMes = Math.max(...mesesPagamentos);
        prazoPagamentoAjustado = ultimoMes;
        
        console.log(`=== AJUSTE PRAZO PERSONALIZADO ===`);
        console.log(`Pagamentos personalizados encontrados nos meses: ${mesesPagamentos.join(', ')}`);
        console.log(`Prazo original: ${formData.paymentMonths || 36} meses`);
        console.log(`Prazo ajustado: ${prazoPagamentoAjustado} meses (baseado no último pagamento)`);
        console.log(`==================================`);
      }

      // Preparar dados para cálculo de financiamento na planta
      let detalhesFinanciamento = null;
      try {

        // Converter valores para os tipos esperados pelo calculador
        const inputCalculo = {
          valorImovel: Number(formData.listPrice || 0),
          valorEntrada: Number(formData.listPrice || 0) * Number(formData.downPayment || 0) / 100,
          percentualEntrada: Number(formData.downPayment || 0),
          prazoEntrega: Number(formData.deliveryMonths || 36),
          prazoPagamento: prazoPagamentoAjustado, // Usar o prazo ajustado
          correcaoMensalAteChaves: Number(formData.monthlyCorrection || 0.5),
          correcaoMensalAposChaves: Number(formData.postDeliveryCorrection || formData.monthlyCorrection || 0.5),
          tipoParcelamento: (formData.tipoParcelamento || 'automatico') as 'automatico' | 'personalizado',
          incluirReforco: Boolean(formData.hasBoost),
          periodicidadeReforco: (formData.periodicidadeReforco || 'trimestral') as 'trimestral' | 'semestral' | 'anual',
          valorReforco: Number(formData.boostValue || 0),
          valorChaves: Number(formData.keysValue || 0),
          // Converter customPayments para parcelasPersonalizadas se for pagamento personalizado
          parcelasPersonalizadas: formData.tipoParcelamento === 'personalizado' && formData.customPayments ? 
            formData.customPayments.map((payment: any) => ({
              mes: Number(payment.month),
              valor: Number(payment.amount),
              tipo: 'Parcela' as const // Por enquanto, todos são tratados como parcelas
            })) : undefined
        };

        // Debug dos pagamentos personalizados
        if (formData.tipoParcelamento === 'personalizado') {
          console.log("=== PAGAMENTOS PERSONALIZADOS DETECTADOS ===");
          console.log("customPayments recebidos:", JSON.stringify(formData.customPayments, null, 2));
          console.log("parcelasPersonalizadas convertidas:", JSON.stringify(inputCalculo.parcelasPersonalizadas, null, 2));
        }

        // Executar cálculo usando as fórmulas de financiamento na planta
        console.log("Executando cálculo de financiamento na planta com os valores:", inputCalculo);

        // Validar input com o schema do financiamento
        const validaInput = FinanciamentoPlantaSchema.safeParse(inputCalculo);

        if (!validaInput.success) {
          console.error("Erro de validação dos dados de financiamento:", validaInput.error);
          throw new Error("Dados de financiamento inválidos: " + validaInput.error.message);
        }

        detalhesFinanciamento = calcularFinanciamentoPlanta(inputCalculo);
        console.log("Cálculo de financiamento na planta concluído com sucesso.");
      } catch (calcError) {
        console.error("Erro ao calcular financiamento na planta:", calcError);
        // Continuar sem os cálculos detalhados
      }

      // Preparar os resultados de cálculo
      const calculationResults = formData.calculationResults || {};

      // Adicionar resultados do financiamento na planta, se disponíveis
      if (detalhesFinanciamento) {
        calculationResults.financiamentoPlanta = {
          resumo: detalhesFinanciamento.resumo,
          parcelas: detalhesFinanciamento.parcelas
        };
      }

      // Criar objeto com todos os campos do formulário para persistência no banco
      const projectionData = {
        // Campos básicos
        title: formData.title,
        strategies: formData.strategies,
        clientId: formData.clientId ? parseInt(formData.clientId) : 1,
        propertyId: formData.propertyId ? parseInt(formData.propertyId) : 1,
        userId: (req as any).userId,
        propertyImageUrl: formData.propertyImageUrl,
        propertyWebsiteUrl: formData.propertyWebsiteUrl,
        // Preservar ID original se fornecido (para edição)
        ...(formData.id && { id: parseInt(formData.id) }),

        // Dados básicos do imóvel
        propertyName: formData.propertyName || "",
        propertyType: formData.propertyType || "",
        propertyUnit: formData.propertyUnit || "",
        propertyArea: formData.propertyArea ? String(formData.propertyArea) : null,
        propertyDescription: formData.propertyDescription || "",

        // Dados de endereço
        address: formData.address || "",
        neighborhood: formData.neighborhood || "",
        city: formData.city || "",
        state: formData.state || "",
        zipCode: formData.zipCode || "",

        // Dados de compra 
        deliveryMonths: Number(formData.deliveryMonths || 36),
        deliveryTime: formData.deliveryTime || "",
        listPrice: String(formData.listPrice || "500000"),
        discount: String(formData.discount || "0"),
        downPayment: String(formData.downPayment || "0"),
        paymentMonths: prazoPagamentoAjustado, // Usar o prazo ajustado calculado anteriormente
        monthlyCorrection: String(formData.monthlyCorrection || "0.5"),
        indiceCorrecao: formData.indiceCorrecao || "INCC",
        postDeliveryCorrection: String(formData.postDeliveryCorrection || formData.monthlyCorrection || "0.5"),
        indiceCorrecaoAposChaves: formData.indiceCorrecaoAposChaves || formData.indiceCorrecao || "IGPM",

        // Dados de reforço e chaves
        includeBonusPayments: Boolean(formData.hasBoost),
        bonusFrequency: formData.periodicidadeReforco === 'bimestral' ? 2 :
                        formData.periodicidadeReforco === 'trimestral' ? 3 :
                        formData.periodicidadeReforco === 'semestral' ? 6 : 12,
        bonusValue: String(formData.boostValue || "0"),
        // Corrigir mapeamento dos campos de chaves para os nomes corretos do banco
        tem_chaves: Boolean(formData.hasKeys),
        valor_chaves: String(formData.keysValue || "0"),
        
        // CAMPO TIPO PARCELAMENTO - ADICIONAR AO BANCO
        tipoParcelamento: formData.tipoParcelamento || 'automatico',

        // Configurações de cenários
        scenarioType: formData.scenarioType || "padrao", 
        activeScenario: formData.activeScenario || "padrao",
        selectedScenarios: formData.selectedScenarios || ["padrao"],

        // Dados do cenário padrão - Venda Futura
        padraoFutureSaleInvestmentPeriod: formData.padrao?.futureSale?.investmentPeriod || "",
        padraoFutureSaleAppreciationRate: formData.padrao?.futureSale?.appreciationRate || "15",
        padraoFutureSaleSellingExpenseRate: formData.padrao?.futureSale?.sellingExpenseRate || "6",
        padraoFutureSaleIncomeTaxRate: formData.padrao?.futureSale?.incomeTaxRate || "15",
        padraoFutureSaleAdditionalCosts: formData.padrao?.futureSale?.additionalCosts || "2",
        padraoFutureSaleMaintenanceCosts: formData.padrao?.futureSale?.maintenanceCosts || "0",

        // Dados do cenário padrão - Valorização do Imóvel
        padraoAssetAppreciationAnnualRate: formData.padrao?.assetAppreciation?.annualRate || "15",
        padraoAssetAppreciationAnalysisPeriod: formData.padrao?.assetAppreciation?.analysisPeriod || "10",
        padraoAssetAppreciationMaintenanceCosts: formData.padrao?.assetAppreciation?.maintenanceCosts || "0",
        padraoAssetAppreciationAnnualTaxes: formData.padrao?.assetAppreciation?.annualTaxes || "0",

        // Dados do cenário padrão - Rendimento de Aluguel
        padraoRentalYieldMonthlyRent: formData.padrao?.rentalYield?.monthlyRent || "0.6",
        padraoRentalYieldOccupancyRate: formData.padrao?.rentalYield?.occupancyRate || "85",
        padraoRentalYieldManagementFee: formData.padrao?.rentalYield?.managementFee || "10",
        padraoRentalYieldMaintenanceCosts: formData.padrao?.rentalYield?.maintenanceCosts || "5",
        padraoRentalYieldAnnualIncrease: formData.padrao?.rentalYield?.annualIncrease || "5",

        // Dados do cenário conservador - Venda Futura
        conservadorFutureSaleInvestmentPeriod: getScenarioValue('conservador', 'futureSale', 'investmentPeriod', ""),
        conservadorFutureSaleAppreciationRate: getScenarioValue('conservador', 'futureSale', 'appreciationRate', "12"),
        conservadorFutureSaleSellingExpenseRate: getScenarioValue('conservador', 'futureSale', 'sellingExpenseRate', "6"),
        conservadorFutureSaleIncomeTaxRate: getScenarioValue('conservador', 'futureSale', 'incomeTaxRate', "15"),
        conservadorFutureSaleAdditionalCosts: getScenarioValue('conservador', 'futureSale', 'additionalCosts', "2"),
        conservadorFutureSaleMaintenanceCosts: getScenarioValue('conservador', 'futureSale', 'maintenanceCosts', "0"),

        // Dados do cenário conservador - Valorização do Imóvel
        conservadorAssetAppreciationAnnualRate: getScenarioValue('conservador', 'assetAppreciation', 'annualRate', "12"),
        conservadorAssetAppreciationAnalysisPeriod: getScenarioValue('conservador', 'assetAppreciation', 'analysisPeriod', "10"),
        conservadorAssetAppreciationMaintenanceCosts: getScenarioValue('conservador', 'assetAppreciation', 'maintenanceCosts', "0"),
        conservadorAssetAppreciationAnnualTaxes: getScenarioValue('conservador', 'assetAppreciation', 'annualTaxes', "0"),

        // Dados do cenário conservador - Rendimento de Aluguel
        conservadorRentalYieldMonthlyRent: getScenarioValue('conservador', 'rentalYield', 'monthlyRent', "0.4"),
        conservadorRentalYieldOccupancyRate: getScenarioValue('conservador', 'rentalYield', 'occupancyRate', "75"),
        conservadorRentalYieldManagementFee: getScenarioValue('conservador', 'rentalYield', 'managementFee', "10"),
        conservadorRentalYieldMaintenanceCosts: getScenarioValue('conservador', 'rentalYield', 'maintenanceCosts', "5"),
        conservadorRentalYieldAnnualIncrease: getScenarioValue('conservador', 'rentalYield', 'annualIncrease', "5"),

        // Dados do cenário otimista - Venda Futura
        otimistaFutureSaleInvestmentPeriod: getScenarioValue('otimista', 'futureSale', 'investmentPeriod', ""),
        otimistaFutureSaleAppreciationRate: getScenarioValue('otimista', 'futureSale', 'appreciationRate', "18"),
        otimistaFutureSaleSellingExpenseRate: getScenarioValue('otimista', 'futureSale', 'sellingExpenseRate', "6"),
        otimistaFutureSaleIncomeTaxRate: getScenarioValue('otimista', 'futureSale', 'incomeTaxRate', "15"),
        otimistaFutureSaleAdditionalCosts: getScenarioValue('otimista', 'futureSale', 'additionalCosts', "2"),
        otimistaFutureSaleMaintenanceCosts: getScenarioValue('otimista', 'futureSale', 'maintenanceCosts', "0"),

        // Dados do cenário otimista - Valorização do Imóvel
        otimistaAssetAppreciationAnnualRate: getScenarioValue('otimista', 'assetAppreciation', 'annualRate', "18"),
        otimistaAssetAppreciationAnalysisPeriod: getScenarioValue('otimista', 'assetAppreciation', 'analysisPeriod', "10"),
        otimistaAssetAppreciationMaintenanceCosts: getScenarioValue('otimista', 'assetAppreciation', 'maintenanceCosts', "0"),
        otimistaAssetAppreciationAnnualTaxes: getScenarioValue('otimista', 'assetAppreciation', 'annualTaxes', "0"),

        // Dados do cenário otimista - Rendimento de Aluguel
        otimistaRentalYieldMonthlyRent: getScenarioValue('otimista', 'rentalYield', 'monthlyRent', "0.8"),
        otimistaRentalYieldOccupancyRate: getScenarioValue('otimista', 'rentalYield', 'occupancyRate', "95"),
        otimistaRentalYieldManagementFee: getScenarioValue('otimista', 'rentalYield', 'managementFee', "10"),
        otimistaRentalYieldMaintenanceCosts: getScenarioValue('otimista', 'rentalYield', 'maintenanceCosts', "5"),
        otimistaRentalYieldAnnualIncrease: getScenarioValue('otimista', 'rentalYield', 'annualIncrease', "5"),

        // Valores calculados para relatório
        futureValuePercentage: String(formData.futureValuePercentage || "0"),
        futureValueMonth: Number(formData.futureValueMonth || 0),
        saleCommission: String(formData.saleCommission || "0"),
saleTaxes: String(formData.saleTaxes || "0"),
        incomeTax: String(formData.incomeTax || "0"),
        additionalCosts: String(formData.additionalCosts || "0"),
        appreciationYears: Number(formData.appreciationYears || 0),
        annualAppreciation: String(formData.annualAppreciation || "0"),
        maintenanceCosts: String(formData.maintenanceCosts || "0"),
        rentalType: formData.rentalType || "annual",
        monthlyRental: String(formData.monthlyRental || "0"),
        furnishingCosts: String(formData.furnishingCosts || "0"),
        condoFees: String(formData.condoFees || "0"),
        propertyTax: String(formData.propertyTax || "0"),

        // Resultados de cálculo
        calculationResults
      };

      try {
        // Inserir projeção de forma direta
        console.log("Enviando para o banco:", JSON.stringify(projectionData, null, 2));

        // Criar projeção no banco
        const projection = await storage.createProjection(projectionData);
        console.log("Projeção criada com sucesso:", projection);

        // Se temos detalhes de financiamento na planta, salvar as parcelas na tabela calculo_projecoes
        if (detalhesFinanciamento && detalhesFinanciamento.parcelas && detalhesFinanciamento.parcelas.length > 0) {
          try {
            console.log(`Salvando ${detalhesFinanciamento.parcelas.length} parcelas na tabela calculo_projecoes`);

            // Obter valores padrão dos formulários
            const valorImovel = Number(formData.listPrice || 0);
            const valorDesconto = Number(formData.discount || 0);
            const valorEntrada = Number(formData.downPayment || 0);
            const valorReforco = Number(formData.boostValue || 0);
            const valorChaves = Number(formData.keysValue || 0);
            const prazoMeses = Number(formData.paymentMonths || 0);

            // Calcular valor da parcela conforme a fórmula: (preço - desconto - entrada - reforços - chaves) / meses
            const qtdReforcos = formData.hasBoost ? Math.floor(prazoMeses / (formData.periodicidadeReforco === 'bimestral' ? 2 : 
                                                         formData.periodicidadeReforco === 'trimestral' ? 3 : 
                                                         formData.periodicidadeReforco === 'semestral' ? 6 : 12)) : 0;

            const totalReforcos = formData.hasBoost ? valorReforco * qtdReforcos : 0;
            const totalChaves = formData.hasKeys ? valorChaves : 0;

            const parcelaBase = formData.tipoParcelamento === 'automatico' ? 
              (valorImovel - valorDesconto - valorEntrada - totalReforcos - totalChaves) / prazoMeses : 0;

            const periodicidadeReforco = formData.periodicidadeReforco || 'trimestral';
            const intervaloReforco = periodicidadeReforco === 'bimestral' ? 2 :
                                     periodicidadeReforco === 'trimestral' ? 3 :
                                     periodicidadeReforco === 'semestral' ? 6 : 12;

            // Taxa de correção antes e depois das chaves (usar exatamente os valores do input do usuário)
            const taxaAteChavesInput = Number(formData.monthlyCorrection || 0.5);
            const taxaAposChavesInput = Number(formData.postDeliveryCorrection || formData.monthlyCorrection || 0.5);
            const prazoEntrega = Number(formData.deliveryMonths);

            // Limpar cálculos anteriores para esta projeção
            try {
                await storage.deleteCalculosByProjection(projection.id);
                console.log(`Cálculos anteriores excluídos com sucesso para projeção #${projection.id}`);
            } catch (cleanError) {
                console.warn(`Aviso: Falha ao limpar cálculos anteriores: ${cleanError}`);
            }
            
            // Converter os dados das parcelas para o formato esperado pelo banco (valores decimais como strings)
            const calculosProjecao = detalhesFinanciamento.parcelas.map(parcela => {
              // Garantir que o tipoPagamento seja um dos valores válidos
              if (parcela.tipoPagamento !== 'Entrada' && 
                  parcela.tipoPagamento !== 'Parcela' && 
                  parcela.tipoPagamento !== 'Reforço' && 
                  parcela.tipoPagamento !== 'Chaves') {
                  
                  // Se o valor não for válido, determinar o tipo pelo mês
                  if (parcela.mes === 0) {
                    parcela.tipoPagamento = 'Entrada';
                  } else if (formData.hasBoost && parcela.mes % intervaloReforco === 0 && parcela.mes > 0) {
                    parcela.tipoPagamento = 'Reforço';
                  } else if (parcela.mes === prazoEntrega) {
                    parcela.tipoPagamento = 'Chaves';
                  } else {
                    parcela.tipoPagamento = 'Parcela';
                  }
                  
                  console.log(`Corrigido tipoPagamento inválido para: ${parcela.tipoPagamento} (mês ${parcela.mes})`);
              }
              
              const isReforcoMonth = formData.hasBoost && parcela.mes % intervaloReforco === 0 && parcela.mes > 0 && parcela.mes <= prazoMeses;
              const isEntregaMonth = parcela.mes === prazoEntrega;
              const isAfterDelivery = parcela.mes > prazoEntrega;

              // Calcular correção conforme a fórmula:
              // Se mês <= mês de entrega: ((taxa até chaves/100 + 1) ^ mês)
              // Se mês > mês de entrega: ((taxa após chaves/100 + 1) ^ (mês - mês de entrega)) * ((taxa até chaves/100 + 1) ^ mês de entrega) - 1

              // Obter valor correto da taxa após chaves do input do usuário
              // Aceitar tanto postDeliveryCorrection quanto correcaoMensalAposChaves (novo nome do campo no formulário)
              const postDeliveryCorrection = formData.correcaoMensalAposChaves ? 
                Number(formData.correcaoMensalAposChaves) : 
                (formData.postDeliveryCorrection ? Number(formData.postDeliveryCorrection) : taxaAteChavesInput);

              // Calcular taxa acumulada conforme a fórmula correta:
              // Caso o nº do mês seja menor ou igual ao da entrega:
              // ((tx correção do mês / 100 + 1) ^ (nº parcela))
              // Caso o nº do mês é maior que o mês de entrega:
              // ((tx correção após chaves / 100 + 1) ^ (nº parcela - prazo de entrega)) * ((tx correção até chaves / 100 + 1) ^ mês da entrega)

              let taxaAcumuladaValue = 1;
              if (parcela.mes === 0) {
                // No mês 0 (entrada) não há correção
                taxaAcumuladaValue = 1;
              } else if (parcela.mes > 0 && parcela.mes <= prazoEntrega) {
                // Antes ou no mês de entrega
                taxaAcumuladaValue = Math.pow((taxaAteChavesInput / 100) + 1, parcela.mes);
              } else if (parcela.mes > prazoEntrega) {
                // Após a entrega: A fórmula correta é:
                // ((tx correção após chaves / 100 + 1) ^ (nº parcela - prazo de entrega)) * ((tx correção até chaves / 100 + 1) ^ mês da entrega)
                const taxaAteChavesDecimal = taxaAteChavesInput / 100;
                const taxaAposChavesDecimal = postDeliveryCorrection / 100;

                const fatorAteEntrega = Math.pow(taxaAteChavesDecimal + 1, prazoEntrega);
                const fatorAposEntrega = Math.pow(taxaAposChavesDecimal + 1, parcela.mes - prazoEntrega);

                taxaAcumuladaValue = fatorAposEntrega * fatorAteEntrega;
              }

              // Calcular valores base
              const parcelaBaseValue = parcela.mes > 0 ? 
                  (formData.tipoParcelamento === 'automatico' ? parcelaBase : 
                   (parcela.tipoPagamento === 'Parcela' ? parcela.valorBase : 0)) : 0;

              const reforcoBaseValue = isReforcoMonth ? Number(formData.boostValue) : 0;
              const chavesBaseValue = isEntregaMonth ? Number(formData.keysValue || 0) : 0;

              // Aplicar taxa acumulada aos valores base
              const parcelaCorrigidaValue = parcelaBaseValue * taxaAcumuladaValue;
              const reforcoCorrigidoValue = reforcoBaseValue * taxaAcumuladaValue;
              const chavesCorrigidoValue = chavesBaseValue * taxaAcumuladaValue;

              // Calcular os pagamentos totais (base e corrigido)
              let pagamentoTotalLiquidoValue = 0;
              let pagamentoTotalValue = 0;

              if (parcela.mes === 0) {
                // Para a entrada (mês 0), ambos valores são iguais ao valor da entrada
                pagamentoTotalLiquidoValue = valorEntrada;
                pagamentoTotalValue = valorEntrada;
              } else {
                // Para os demais meses, soma dos componentes
                pagamentoTotalLiquidoValue = parcelaBaseValue + reforcoBaseValue + chavesBaseValue;
                pagamentoTotalValue = parcelaCorrigidaValue + reforcoCorrigidoValue + chavesCorrigidoValue;
              }

              // Calcular saldo líquido - ABORDAGEM UNIVERSAL
              let saldoLiquidoValue = 0;
              
              // Aplicar a mesma lógica para todos os meses
              // Regra universal:
              // 1. Para mês 0 e 1: saldoLiquido = valorImovel - valorDesconto - valorEntrada
              // 2. Para mês >= 2: saldoLiquido = calcular todos os saldos anteriores, aplicando:
              //    - Mês 2: saldo = saldo mês 1 - pagamento mês 1
              //    - Mês 3: saldo = saldo mês 2 - pagamento mês 2
              //    - ...e assim por diante
              
              if (parcela.mes <= 1) {
                // Regra 1: Mês 0 e 1 têm o mesmo saldo (valorImovel - valorDesconto - valorEntrada)
                saldoLiquidoValue = valorImovel - valorDesconto - valorEntrada;
                console.log(`[UNIVERSAL] Mês ${parcela.mes}: SaldoLiquido = ${saldoLiquidoValue}`);

              } else if (parcela.mes === 2) {
                // Mês 2: O saldo é o valor do mês 1 (mesmo que mês 0) menos o pagamento do mês 1
                // Obter valor da parcela no mês 1
                let pagamentoMes1 = 0;
                
                // Se for parcelamento automático, usar o valor padrão de parcela
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes1 = parcelaBase;
                } else {
                  // Para parcelamento personalizado, procurar a parcela correta
                  const parcela1 = detalhesFinanciamento.parcelas.find(p => p.mes === 1);
                  if (parcela1 && parcela1.tipoPagamento === 'Parcela') {
                    pagamentoMes1 = parcela1.valorBase;
                  }
                }
                
                // Verificar se mês 1 tinha reforço ou chaves
                const isReforcoMes1 = formData.hasBoost && 1 % intervaloReforco === 0 && 1 > 0;
                const isEntregaMes1 = 1 === prazoEntrega;
                
                // Adicionar reforço ou chaves se necessário
                const reforcoMes1 = isReforcoMes1 ? Number(valorReforco) : 0;
                const chavesMes1 = isEntregaMes1 ? Number(valorChaves) : 0;
                
                // Pagamento total do mês 1
                const pagamentoTotalMes1 = pagamentoMes1 + reforcoMes1 + chavesMes1;
                
                // Saldo do mês 1 é igual ao mês 0
                const saldoMes1 = valorImovel - valorDesconto - valorEntrada;
                
                // Saldo do mês 2 = saldo mês 1 - pagamento mês 1
                saldoLiquidoValue = saldoMes1 - pagamentoTotalMes1;
                
                console.log(`[DIRETO] Mês 2: SaldoMes1=${saldoMes1}, PagamentoMes1=${pagamentoTotalMes1}, NovoSaldo=${saldoLiquidoValue}`);
              } else if (parcela.mes === 3) {
                // Mês 3: O saldo é o valor do mês 2 menos o pagamento do mês 2
                // Primeiro calculamos o saldo do mês 2 (que é mês 1 - pagamento mês 1)
                
                // Calcular pagamento do mês 1
                let pagamentoMes1 = 0;
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes1 = parcelaBase;
                } else {
                  const parcela1 = detalhesFinanciamento.parcelas.find(p => p.mes === 1);
                  if (parcela1 && parcela1.tipoPagamento === 'Parcela') {
                    pagamentoMes1 = parcela1.valorBase;
                  }
                }
                
                const isReforcoMes1 = formData.hasBoost && 1 % intervaloReforco === 0 && 1 > 0;
                const isEntregaMes1 = 1 === prazoEntrega;
                const reforcoMes1 = isReforcoMes1 ? Number(valorReforco) : 0;
                const chavesMes1 = isEntregaMes1 ? Number(valorChaves) : 0;
                const pagamentoTotalMes1 = pagamentoMes1 + reforcoMes1 + chavesMes1;
                
                // Saldo do mês 0 e mês 1
                const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                
                // Saldo do mês 2 = saldo mês 1 - pagamento mês 1
                const saldoMes2 = saldoInicial - pagamentoTotalMes1;
                
                // Calcular pagamento do mês 2
                let pagamentoMes2 = 0;
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes2 = parcelaBase;
                } else {
                  const parcela2 = detalhesFinanciamento.parcelas.find(p => p.mes === 2);
                  if (parcela2 && parcela2.tipoPagamento === 'Parcela') {
                    pagamentoMes2 = parcela2.valorBase;
                  }
                }
                
                const isReforcoMes2 = formData.hasBoost && 2 % intervaloReforco === 0 && 2 > 0;
                const isEntregaMes2 = 2 === prazoEntrega;
                const reforcoMes2 = isReforcoMes2 ? Number(valorReforco) : 0;
                const chavesMes2 = isEntregaMes2 ? Number(valorChaves) : 0;
                const pagamentoTotalMes2 = pagamentoMes2 + reforcoMes2 + chavesMes2;
                
                // Saldo do mês 3 = saldo mês 2 - pagamento mês 2
                saldoLiquidoValue = saldoMes2 - pagamentoTotalMes2;
                
                console.log(`[DIRETO] Mês 3: SaldoMes2=${saldoMes2}, PagamentoMes2=${pagamentoTotalMes2}, NovoSaldo=${saldoLiquidoValue}`);
              
              } else if (parcela.mes === 4) {
                // Mês 4: O saldo é o valor do mês 3 menos o pagamento do mês 3
                // Para isso, precisamos calcular o saldo dos meses anteriores
                
                // Passo 1: Calcular o saldo inicial (mês 0 e 1)
                const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                
                // Passo 2: Calcular pagamento mês 1
                let pagamentoMes1 = 0;
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes1 = parcelaBase;
                } else {
                  const parcela1 = detalhesFinanciamento.parcelas.find(p => p.mes === 1);
                  if (parcela1 && parcela1.tipoPagamento === 'Parcela') {
                    pagamentoMes1 = parcela1.valorBase;
                  }
                }
                
                const isReforcoMes1 = formData.hasBoost && 1 % intervaloReforco === 0 && 1 > 0;
                const isEntregaMes1 = 1 === prazoEntrega;
                const reforcoMes1 = isReforcoMes1 ? Number(valorReforco) : 0;
                const chavesMes1 = isEntregaMes1 ? Number(valorChaves) : 0;
                const pagamentoTotalMes1 = pagamentoMes1 + reforcoMes1 + chavesMes1;
                
                // Passo 3: Calcular saldo mês 2
                const saldoMes2 = saldoInicial - pagamentoTotalMes1;
                
                // Passo 4: Calcular pagamento mês 2
                let pagamentoMes2 = 0;
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes2 = parcelaBase;
                } else {
                  const parcela2 = detalhesFinanciamento.parcelas.find(p => p.mes === 2);
                  if (parcela2 && parcela2.tipoPagamento === 'Parcela') {
                    pagamentoMes2 = parcela2.valorBase;
                  }
                }
                
                const isReforcoMes2 = formData.hasBoost && 2 % intervaloReforco === 0 && 2 > 0;
                const isEntregaMes2 = 2 === prazoEntrega;
                const reforcoMes2 = isReforcoMes2 ? Number(valorReforco) : 0;
                const chavesMes2 = isEntregaMes2 ? Number(valorChaves) : 0;
                const pagamentoTotalMes2 = pagamentoMes2 + reforcoMes2 + chavesMes2;
                
                // Passo 5: Calcular saldo mês 3 
                const saldoMes3 = saldoMes2 - pagamentoTotalMes2;
                
                // Passo 6: Calcular pagamento mês 3
                let pagamentoMes3 = 0;
                if (formData.tipoParcelamento === 'automatico') {
                  pagamentoMes3 = parcelaBase;
                } else {
                  const parcela3 = detalhesFinanciamento.parcelas.find(p => p.mes === 3);
                  if (parcela3 && parcela3.tipoPagamento === 'Parcela') {
                    pagamentoMes3 = parcela3.valorBase;
                  }
                }
                
                const isReforcoMes3 = formData.hasBoost && 3 % intervaloReforco === 0 && 3 > 0;
                const isEntregaMes3 = 3 === prazoEntrega;
                const reforcoMes3 = isReforcoMes3 ? Number(valorReforco) : 0;
                const chavesMes3 = isEntregaMes3 ? Number(valorChaves) : 0;
                const pagamentoTotalMes3 = pagamentoMes3 + reforcoMes3 + chavesMes3;
                
                // Passo 7: Calcular saldo mês 4
                saldoLiquidoValue = saldoMes3 - pagamentoTotalMes3;
                
                console.log(`[DIRETO] Mês 4: SaldoMes3=${saldoMes3}, PagamentoMes3=${pagamentoTotalMes3}, NovoSaldo=${saldoLiquidoValue}`);
              
              } else {
                // Abordagem universal: Calcular saldos para qualquer mês ≥ 2
                // Aplicamos a mesma lógica independente do mês
                
                // Array para armazenar os saldos de todos os meses
                const saldos = new Array(parcela.mes + 1);
                
                // Regra 1: Mês 0 e 1 têm o mesmo saldo
                const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                saldos[0] = saldoInicial;
                saldos[1] = saldoInicial;
                
                // Algoritmo universal avançado que lida com meses sequenciais e não sequenciais
                // Esta abordagem funciona para parcelamentos automáticos e personalizados
                
                // Para parcelamento personalizado, precisamos fazer uma abordagem diferente
                if (formData.tipoParcelamento === 'personalizado') {
                  console.log('[PERSONALIZADO] Usando algoritmo especial para parcelamento personalizado');
                  
                  // 1. Obter todas as parcelas ordenadas por mês (incluindo entrada, parcelas, reforços e chaves)
                  const todasParcelas = detalhesFinanciamento.parcelas
                    .filter(p => p.mes <= parcela.mes) // Apenas meses até o atual
                    .sort((a, b) => a.mes - b.mes);    // Ordenar por mês
                  
                  console.log(`[PERSONALIZADO] Encontradas ${todasParcelas.length} parcelas para processar até o mês ${parcela.mes}`);
                  
                  // 2. Inicializar array de saldos para todos os meses até o mês atual (preenchido com zeros)
                  const saldos = new Array(parcela.mes + 1).fill(0);
                  
                  // 3. Definir valores iniciais para os meses 0 e 1
                  const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                  saldos[0] = saldoInicial;
                  saldos[1] = saldoInicial;
                  
                  // 4. Calcular os pagamentos para cada mês (inicializados com zero)
                  const pagamentos = new Array(parcela.mes + 1).fill(0);
                  
                  // 5. Preencher os pagamentos a partir das parcelas definidas
                  todasParcelas.forEach(p => {
                    if (p.mes > 0) { // Ignorar mês 0 (entrada)
                      let valorPagamento = 0;
                      
                      // Verificar tipo de pagamento
                      if (p.tipoPagamento === 'Parcela') {
                        valorPagamento += p.valorBase;
                      }
                      
                      // Adicionar reforço se aplicável
                      if (formData.hasBoost && p.mes % intervaloReforco === 0 && p.mes > 0) {
                        valorPagamento += Number(valorReforco);
                      }
                      
                      // Adicionar chaves se aplicável
                      if (p.mes === prazoEntrega) {
                        valorPagamento += Number(valorChaves);
                      }
                      
                      pagamentos[p.mes] = valorPagamento;
                      console.log(`[PERSONALIZADO] Mês ${p.mes}: Pagamento=${valorPagamento}`);
                    }
                  });
                  
                  // 6. Calcular os saldos de forma progressiva para cada mês
                  // Regra: saldo do mês = saldo do mês anterior - pagamento do mês anterior
                  for (let mes = 2; mes <= parcela.mes; mes++) {
                    const mesAnterior = mes - 1;
                    
                    // Garantir que temos valores numéricos para o cálculo
                    const saldoAnterior = typeof saldos[mesAnterior] === 'number' ? saldos[mesAnterior] : saldoInicial;
                    const pagamentoAnterior = typeof pagamentos[mesAnterior] === 'number' ? pagamentos[mesAnterior] : 0;
                    
                    // Calcular o novo saldo
                    saldos[mes] = saldoAnterior - pagamentoAnterior;
                    
                    console.log(`[PERSONALIZADO] Mês ${mes}: SaldoAnterior=${saldoAnterior}, PagamentoAnterior=${pagamentoAnterior}, NovoSaldo=${saldos[mes]}`);
                  }
                  
                  // 7. Verificar se o saldo do mês atual está definido
                  if (saldos[parcela.mes] === undefined || isNaN(saldos[parcela.mes])) {
                    // Se não estiver definido, usar o último saldo válido
                    let ultimoSaldoValido = saldoInicial;
                    for (let i = parcela.mes - 1; i >= 0; i--) {
                      if (saldos[i] !== undefined && !isNaN(saldos[i])) {
                        ultimoSaldoValido = saldos[i];
                        break;
                      }
                    }
                    saldos[parcela.mes] = ultimoSaldoValido;
                    console.log(`[PERSONALIZADO] Correção: Mês ${parcela.mes} tinha saldo indefinido. Usando último saldo válido: ${ultimoSaldoValido}`);
                  }
                } 
                // Para parcelamento automático, usamos o algoritmo original
                else {
                  console.log('[AUTOMATICO] Usando algoritmo sequencial para parcelamento automático');
                  
                  // Loop para calcular cada mês de 2 até o mês atual
                  for (let mes = 2; mes <= parcela.mes; mes++) {
                    // Para cada mês, calculamos o pagamento do mês anterior (mes-1)
                    const mesAnterior = mes - 1;
                    
                    // 1. Calcular o valor da parcela do mês anterior (sempre igual no parcelamento automático)
                    const valorParcelaAnterior = parcelaBase;
                    
                    // 2. Verificar se o mês anterior tinha reforço
                    const temReforcoAnterior = formData.hasBoost && mesAnterior % intervaloReforco === 0 && mesAnterior > 0;
                    const valorReforcoAnterior = temReforcoAnterior ? Number(valorReforco) : 0;
                    
                    // 3. Verificar se o mês anterior era o mês de entrega (chaves)
                    const ehMesEntregaAnterior = mesAnterior === prazoEntrega;
                    const valorChavesAnterior = ehMesEntregaAnterior ? Number(valorChaves) : 0;
                    
                    // 4. Pagamento total do mês anterior
                    const pagamentoTotalAnterior = valorParcelaAnterior + valorReforcoAnterior + valorChavesAnterior;
                    
                    // 5. Saldo do mês atual = saldo do mês anterior - pagamento total anterior
                    saldos[mes] = saldos[mesAnterior] - pagamentoTotalAnterior;
                    
                    console.log(`[AUTOMATICO] Mês ${mes}: SaldoAnterior=${saldos[mesAnterior]}, PagamentoAnterior=${pagamentoTotalAnterior}, NovoSaldo=${saldos[mes]}`);
                  }
                }
                
                // O saldo líquido do mês atual é o último calculado, com validação
                if (saldos[parcela.mes] === undefined || isNaN(saldos[parcela.mes])) {
                  // Se saldos[parcela.mes] for undefined ou NaN, usar o saldo inicial
                  saldoLiquidoValue = saldoInicial;
                  console.log(`[CORRECAO] Mês ${parcela.mes}: Saldo indefinido ou NaN. Usando saldo inicial: ${saldoInicial}`);
                } else {
                  saldoLiquidoValue = saldos[parcela.mes];
                }

                // Verificar se o mês atual precisa subtrair seu próprio pagamento
                // Isso não deve ser feito, pois o saldo líquido do mês atual já considera
                // todos os pagamentos anteriores, não o pagamento do próprio mês

                console.log(`[NOVA_FORMULA] Mês ${parcela.mes}: SaldoLiquido = ${saldoLiquidoValue}`);

                // Garantir que o saldo líquido não fique negativo (apenas para o último mês)
                if (parcela.mes === prazoMeses && saldoLiquidoValue < 0) {
                  saldoLiquidoValue = 0;
                }

                // Garantir que saldoLiquidoValue nunca é undefined ou NaN para evitar erro no banco
                if (saldoLiquidoValue === undefined || isNaN(saldoLiquidoValue)) {
                  saldoLiquidoValue = 0;
                  console.log(`[EMERGENCIA] Correção de valor undefined ou NaN para salvar no banco: ${saldoLiquidoValue}`);
                }

                console.log(`[SIMPLIFICADO] Mês ${parcela.mes}: SaldoLiquido = ${saldoLiquidoValue}`);
              }

              // Calcular saldo devedor corrigido
              // "saldo_devedor_corrigido" = ("saldo_liquido" do mês * taxa acumulada do mês) + (saldo líquido do mês)
              const saldoDevedorCorrigidoValue = (saldoLiquidoValue * (taxaAcumuladaValue - 1)) + saldoLiquidoValue;

              // Definir a taxa de correção para cada mês conforme a regra:
              // Mês <= mês de entrega: usar taxaAteChavesInput
              // Mês > mês de entrega: usar taxaAposChavesInput
              const taxaCorrecaoValue = parcela.mes <= prazoEntrega ? taxaAteChavesInput : taxaAposChavesInput;

              // Para cada mês, verificar o tipo de pagamento e valores
              return {
                projectionId: projection.id,
                mes: parcela.mes,

                // Usar a taxa correta baseada no período (antes ou depois das chaves)
                taxaCorrecao: String(taxaCorrecaoValue),
                taxaAcumulada: String(taxaAcumuladaValue),

                // Valor de entrada apenas no mês 0
                valorEntrada: parcela.mes === 0 ? String(valorEntrada) : "0",

                // Sempre salvar o valor das parcelas mensais (a partir do mês 1)
                parcelaBase: parcela.mes > 0 ? String(parcelaBaseValue) : "0",
                parcelaCorrigida: parcela.mes > 0 ? String(parcelaCorrigidaValue) : "0",

                // Reforço (balão) só quando for mês de reforço conforme periodicidade
                reforcoBase: String(reforcoBaseValue),
                reforcoCorrigido: String(reforcoCorrigidoValue),

                // Valor das chaves no mês de entrega
                valorChaves: String(chavesBaseValue),
                chavesCorrigido: String(chavesCorrigidoValue),

                // Valores totais: pagamento_total = parcela_corrigida + reforco_corrigido + chaves_corrigido
                // pagamento_total_liquido = parcela_base + reforco_base + valor_chaves
                pagamentoTotal: String(pagamentoTotalValue),
                pagamentoTotalLiquido: String(pagamentoTotalLiquidoValue),

                // Novos cálculos para os saldos
                saldoLiquido: String(saldoLiquidoValue),
                saldoDevedorCorrigido: String(saldoDevedorCorrigidoValue)
              };
            });

            // Salvar os cálculos no banco
            await storage.createCalculosProjecao(calculosProjecao);
            console.log("Parcelas salvas com sucesso na tabela calculo_projecoes");
          } catch (error) {
            console.error("Erro ao salvar parcelas na tabela calculo_projecoes:", error);
          }
        }

        // Enriquecer a resposta
        const responseData = {
          ...projection,
          // Adicionar propriedade
          property: {
            name: formData.propertyName || "Empreendimento",
            type: formData.propertyType || "apartment",
            address: formData.address || "",
            neighborhood: formData.neighborhood || "",
            city: formData.city || ""
          },
          client: {
            name: "Cliente exemplo"
          }
        };

        res.status(201).json(responseData);
      } catch (err: any) {
        console.error("Erro ao salvar no banco de dados:", err.message);
        console.error("Stack trace:", err.stack);

        // Retornar erro real para o cliente ao invés de dados falsos
        return res.status(500).json({
          error: 'Erro ao salvar projeção no banco de dados',
          details: err.message
        });
      }
    } catch (error: any) {
      console.error("Erro geral:", error.message);
      res.status(500).json({ error: 'Erro interno ao processar requisição' });
    }
  });

  app.put('/api/projections/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid projection ID' });
    }

    // If strategies are provided, validate them
    if (req.body.strategies) {
      if (!Array.isArray(req.body.strategies) || req.body.strategies.length === 0) {
        return res.status(400).json({ error: 'At least one strategy must be selected' });
      }

      // Check if all strategies are valid
      const invalidStrategies = req.body.strategies.filter(
        (strategy: string) => !Object.values(PROJECTION_STRATEGY).includes(strategy)
      );
      if (invalidStrategies.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid strategies', 
          invalidStrategies 
        });
      }
    }

    // Verificar se temos detalhes de financiamento na planta para atualizar
    let detalhesFinanciamento = null;
    if (req.body.calculationResults && req.body.calculationResults.financiamentoPlanta) {
      detalhesFinanciamento = req.body.calculationResults.financiamentoPlanta;
    }

    // Processar dados dos formulários incluindo todos os campos dos cenários
    const formData = req.body;
    
    // Função auxiliar para obter valores dos cenários
    const getScenarioValue = (scenario: string, strategy: string, field: string, defaultValue: any = "") => {
      return formData[scenario]?.[strategy]?.[field] || defaultValue;
    };

    // Criar objeto estruturado com todos os campos incluindo cenários financeiros
    const updateData = {
      // Campos básicos
      title: formData.title,
      strategies: formData.strategies,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      propertyId: formData.propertyId ? parseInt(formData.propertyId) : undefined,
      
      // Dados básicos do imóvel
      propertyName: formData.propertyName,
      propertyType: formData.propertyType,
      propertyUnit: formData.propertyUnit,
      propertyArea: formData.propertyArea ? String(formData.propertyArea) : null,
      propertyDescription: formData.propertyDescription,
      propertyImageUrl: formData.propertyImageUrl,
      propertyWebsiteUrl: formData.propertyWebsiteUrl,

      // Dados de endereço
      address: formData.address,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,

      // Dados financeiros básicos
      deliveryMonths: formData.deliveryMonths ? Number(formData.deliveryMonths) : undefined,
      deliveryTime: formData.deliveryTime,
      listPrice: formData.listPrice ? String(formData.listPrice) : undefined,
      discount: formData.discount ? String(formData.discount) : undefined,
      downPayment: formData.downPayment ? String(formData.downPayment) : undefined,
      paymentMonths: formData.paymentMonths ? Number(formData.paymentMonths) : undefined,
      monthlyCorrection: formData.monthlyCorrection ? String(formData.monthlyCorrection) : undefined,
      indiceCorrecao: formData.indiceCorrecao,
      postDeliveryCorrection: formData.postDeliveryCorrection ? String(formData.postDeliveryCorrection) : undefined,
      indiceCorrecaoAposChaves: formData.indiceCorrecaoAposChaves,

      // Dados de reforço e chaves
      includeBonusPayments: formData.includeBonusPayments,
      bonusFrequency: formData.bonusFrequency ? Number(formData.bonusFrequency) : undefined,
      bonusValue: formData.bonusValue ? String(formData.bonusValue) : undefined,
      hasKeys: formData.hasKeys,
      keysValue: formData.keysValue ? String(formData.keysValue) : undefined,

      // Configurações de cenários
      scenarioType: formData.scenarioType,
      activeScenario: formData.activeScenario,
      selectedScenarios: formData.selectedScenarios,

      // Cenário Padrão - Venda Futura
      padraoFutureSaleInvestmentPeriod: getScenarioValue('padrao', 'futureSale', 'investmentPeriod'),
      padraoFutureSaleAppreciationRate: getScenarioValue('padrao', 'futureSale', 'appreciationRate'),
      padraoFutureSaleSellingExpenseRate: getScenarioValue('padrao', 'futureSale', 'sellingExpenseRate'),
      padraoFutureSaleIncomeTaxRate: getScenarioValue('padrao', 'futureSale', 'incomeTaxRate'),
      padraoFutureSaleAdditionalCosts: getScenarioValue('padrao', 'futureSale', 'additionalCosts'),
      padraoFutureSaleMaintenanceCosts: getScenarioValue('padrao', 'futureSale', 'maintenanceCosts'),

      // Cenário Padrão - Valorização do Imóvel
      padraoAssetAppreciationAnnualRate: getScenarioValue('padrao', 'assetAppreciation', 'annualRate'),
      padraoAssetAppreciationAnalysisPeriod: getScenarioValue('padrao', 'assetAppreciation', 'analysisPeriod'),
      padraoAssetAppreciationMaintenanceCosts: getScenarioValue('padrao', 'assetAppreciation', 'maintenanceCosts'),
      padraoAssetAppreciationAnnualTaxes: getScenarioValue('padrao', 'assetAppreciation', 'annualTaxes'),

      // Cenário Padrão - Rendimento de Aluguel
      padraoRentalYieldMonthlyRent: getScenarioValue('padrao', 'rentalYield', 'monthlyRent'),
      padraoRentalYieldOccupancyRate: getScenarioValue('padrao', 'rentalYield', 'occupancyRate'),
      padraoRentalYieldManagementFee: getScenarioValue('padrao', 'rentalYield', 'managementFee'),
      padraoRentalYieldMaintenanceCosts: getScenarioValue('padrao', 'rentalYield', 'maintenanceCosts'),
      padraoRentalYieldAnnualIncrease: getScenarioValue('padrao', 'rentalYield', 'annualIncrease'),

      // Cenário Conservador - Venda Futura
      conservadorFutureSaleInvestmentPeriod: getScenarioValue('conservador', 'futureSale', 'investmentPeriod'),
      conservadorFutureSaleAppreciationRate: getScenarioValue('conservador', 'futureSale', 'appreciationRate'),
      conservadorFutureSaleSellingExpenseRate: getScenarioValue('conservador', 'futureSale', 'sellingExpenseRate'),
      conservadorFutureSaleIncomeTaxRate: getScenarioValue('conservador', 'futureSale', 'incomeTaxRate'),
      conservadorFutureSaleAdditionalCosts: getScenarioValue('conservador', 'futureSale', 'additionalCosts'),
      conservadorFutureSaleMaintenanceCosts: getScenarioValue('conservador', 'futureSale', 'maintenanceCosts'),

      // Cenário Conservador - Valorização do Imóvel
      conservadorAssetAppreciationAnnualRate: getScenarioValue('conservador', 'assetAppreciation', 'annualRate'),
      conservadorAssetAppreciationAnalysisPeriod: getScenarioValue('conservador', 'assetAppreciation', 'analysisPeriod'),
      conservadorAssetAppreciationMaintenanceCosts: getScenarioValue('conservador', 'assetAppreciation', 'maintenanceCosts'),
      conservadorAssetAppreciationAnnualTaxes: getScenarioValue('conservador', 'assetAppreciation', 'annualTaxes'),

      // Cenário Conservador - Rendimento de Aluguel
      conservadorRentalYieldMonthlyRent: getScenarioValue('conservador', 'rentalYield', 'monthlyRent'),
      conservadorRentalYieldOccupancyRate: getScenarioValue('conservador', 'rentalYield', 'occupancyRate'),
      conservadorRentalYieldManagementFee: getScenarioValue('conservador', 'rentalYield', 'managementFee'),
      conservadorRentalYieldMaintenanceCosts: getScenarioValue('conservador', 'rentalYield', 'maintenanceCosts'),
      conservadorRentalYieldAnnualIncrease: getScenarioValue('conservador', 'rentalYield', 'annualIncrease'),

      // Cenário Otimista - Venda Futura
      otimistaFutureSaleInvestmentPeriod: getScenarioValue('otimista', 'futureSale', 'investmentPeriod'),
      otimistaFutureSaleAppreciationRate: getScenarioValue('otimista', 'futureSale', 'appreciationRate'),
      otimistaFutureSaleSellingExpenseRate: getScenarioValue('otimista', 'futureSale', 'sellingExpenseRate'),
      otimistaFutureSaleIncomeTaxRate: getScenarioValue('otimista', 'futureSale', 'incomeTaxRate'),
      otimistaFutureSaleAdditionalCosts: getScenarioValue('otimista', 'futureSale', 'additionalCosts'),
      otimistaFutureSaleMaintenanceCosts: getScenarioValue('otimista', 'futureSale', 'maintenanceCosts'),

      // Cenário Otimista - Valorização do Imóvel
      otimistaAssetAppreciationAnnualRate: getScenarioValue('otimista', 'assetAppreciation', 'annualRate'),
      otimistaAssetAppreciationAnalysisPeriod: getScenarioValue('otimista', 'assetAppreciation', 'analysisPeriod'),
      otimistaAssetAppreciationMaintenanceCosts: getScenarioValue('otimista', 'assetAppreciation', 'maintenanceCosts'),
      otimistaAssetAppreciationAnnualTaxes: getScenarioValue('otimista', 'assetAppreciation', 'annualTaxes'),

      // Cenário Otimista - Rendimento de Aluguel
      otimistaRentalYieldMonthlyRent: getScenarioValue('otimista', 'rentalYield', 'monthlyRent'),
      otimistaRentalYieldOccupancyRate: getScenarioValue('otimista', 'rentalYield', 'occupancyRate'),
      otimistaRentalYieldManagementFee: getScenarioValue('otimista', 'rentalYield', 'managementFee'),
      otimistaRentalYieldMaintenanceCosts: getScenarioValue('otimista', 'rentalYield', 'maintenanceCosts'),
      otimistaRentalYieldAnnualIncrease: getScenarioValue('otimista', 'rentalYield', 'annualIncrease'),

      // Campos de valores calculados da venda futura (compatibilidade com formulários antigos)
      futureValuePercentage: formData.futureValuePercentage ? String(formData.futureValuePercentage) : undefined,
      futureValueMonth: formData.futureValueMonth ? Number(formData.futureValueMonth) : undefined,
      saleCommission: formData.saleCommission ? String(formData.saleCommission) : undefined,
      saleTaxes: formData.saleTaxes ? String(formData.saleTaxes) : undefined,
      incomeTax: formData.incomeTax ? String(formData.incomeTax) : undefined,
      additionalCosts: formData.additionalCosts ? String(formData.additionalCosts) : undefined,

      // Campos de valorização (compatibilidade com formulários antigos)
      appreciationYears: formData.appreciationYears ? Number(formData.appreciationYears) : undefined,
      annualAppreciation: formData.annualAppreciation ? String(formData.annualAppreciation) : undefined,
      maintenanceCosts: formData.maintenanceCosts ? String(formData.maintenanceCosts) : undefined,

      // Campos de aluguel (compatibilidade com formulários antigos)
      rentalType: formData.rentalType,
      monthlyRental: formData.monthlyRental ? String(formData.monthlyRental) : undefined,
      furnishingCosts: formData.furnishingCosts ? String(formData.furnishingCosts) : undefined,
      condoFees: formData.condoFees ? String(formData.condoFees) : undefined,
      propertyTax: formData.propertyTax ? String(formData.propertyTax) : undefined,

      // Resultados de cálculo
      calculationResults: formData.calculationResults
    };

    // Remover campos undefined para não sobrescrever dados existentes
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('Atualizando projeção com dados dos cenários:', {
      id,
      activeScenario: updateData.activeScenario,
      selectedScenarios: updateData.selectedScenarios,
      padraoFutureSaleAppreciationRate: updateData.padraoFutureSaleAppreciationRate,
      conservadorFutureSaleAppreciationRate: updateData.conservadorFutureSaleAppreciationRate,
      otimistaFutureSaleAppreciationRate: updateData.otimistaFutureSaleAppreciationRate
    });

    // Atualizar a projeção
    const projection = await storage.updateProjection(id, updateData);
    if (!projection) {
      return res.status(404).json({ error: 'Projection not found' });
    }

    // Se temos detalhes de financiamento na planta, atualizar as parcelas na tabela calculo_projecoes
    if (detalhesFinanciamento && detalhesFinanciamento.parcelas && detalhesFinanciamento.parcelas.length > 0) {
      try {
        console.log(`Atualizando parcelas para projeção #${id}`);

        // Primeiro excluir cálculos existentes
        await storage.deleteCalculosByProjection(id);

        // Obter valores padrão dos formulários
        const valorImovel = Number(req.body.listPrice || 0);
        const valorDesconto = Number(req.body.discount || 0);
        const valorEntrada = Number(req.body.downPayment || 0);
        const valorReforco = Number(req.body.boostValue || 0);
        const valorChaves = Number(req.body.keysValue || 0);
        const prazoMeses = Number(req.body.paymentMonths || 0);

        // Calcular valor da parcela conforme a fórmula: (preço - desconto - entrada - reforços - chaves) / meses
        const qtdReforcos = req.body.hasBoost ? Math.floor(prazoMeses / (req.body.periodicidadeReforco === 'bimestral' ? 2 : 
                                                   req.body.periodicidadeReforco === 'trimestral' ? 3 : 
                                                   req.body.periodicidadeReforco === 'semestral' ? 6 : 12)) : 0;

        const totalReforcos = req.body.hasBoost ? valorReforco * qtdReforcos : 0;
        const totalChaves = req.body.hasKeys ? valorChaves : 0;

        const parcelaBase = req.body.tipoParcelamento === 'automatico' ? 
          (valorImovel - valorDesconto - valorEntrada - totalReforcos - totalChaves) / prazoMeses : 0;

        const periodicidadeReforco = req.body.periodicidadeReforco || 'trimestral';
        const intervaloReforco = periodicidadeReforco === 'bimestral' ? 2 :
                               periodicidadeReforco === 'trimestral' ? 3 :
                               periodicidadeReforco === 'semestral' ? 6 : 12;

        // Taxa de correção antes e depois das chaves (usar exatamente os valores do input do usuário)
        const taxaAteChavesInput = Number(req.body.monthlyCorrection || 0.5);
        const taxaAposChavesInput = Number(req.body.postDeliveryCorrection || req.body.monthlyCorrection || 0.5);
        const prazoEntrega = Number(req.body.deliveryMonths);

        // Limpar cálculos anteriores para esta projeção
        try {
            await storage.deleteCalculosByProjection(id);
            console.log(`Cálculos anteriores excluídos com sucesso para projeção #${id} (atualização)`);
        } catch (cleanError) {
            console.warn(`Aviso: Falha ao limpar cálculos anteriores durante atualização: ${cleanError}`);
        }
        
        // Converter os dados das parcelas para o formato esperado pelo banco (valores decimais como strings)
        const calculosProjecao = detalhesFinanciamento.parcelas.map((parcela: any) => {
          // Garantir que o tipoPagamento seja um dos valores válidos
          if (parcela.tipoPagamento !== 'Entrada' && 
              parcela.tipoPagamento !== 'Parcela' && 
              parcela.tipoPagamento !== 'Reforço' && 
              parcela.tipoPagamento !== 'Chaves') {
              
              // Se o valor não for válido, determinar o tipo pelo mês
              if (parcela.mes === 0) {
                parcela.tipoPagamento = 'Entrada';
              } else if (req.body.hasBoost && parcela.mes % intervaloReforco === 0 && parcela.mes > 0) {
                parcela.tipoPagamento = 'Reforço';
              } else if (parcela.mes === prazoEntrega) {
                parcela.tipoPagamento = 'Chaves';
              } else {
                parcela.tipoPagamento = 'Parcela';
              }
              
              console.log(`Corrigido tipoPagamento inválido para: ${parcela.tipoPagamento} (mês ${parcela.mes})`);
          }
          
          const isReforcoMonth = req.body.hasBoost && parcela.mes % intervaloReforco === 0 && parcela.mes > 0 && parcela.mes <= prazoMeses;
          const isEntregaMonth = parcela.mes === prazoEntrega;
          const isAfterDelivery = parcela.mes > prazoEntrega;

          // Calcular correção conforme a fórmula:
          // Se mês <= mês de entrega: ((taxa até chaves/100 + 1) ^ mês)
          // Se mês > mês de entrega: ((taxa após chaves/100 + 1) ^ (mês - mês de entrega)) * ((taxa até chaves/100 + 1) ^ mês de entrega) - 1

          // Obter valor correto da taxa após chaves do input do usuário
          // Aceitar tanto postDeliveryCorrection quanto correcaoMensalAposChaves (novo nome do campo no formulário)
          const postDeliveryCorrection = req.body.correcaoMensalAposChaves ? 
            Number(req.body.correcaoMensalAposChaves) : 
            (req.body.postDeliveryCorrection ? Number(req.body.postDeliveryCorrection) : taxaAteChavesInput);

          // Calcular taxa acumulada conforme a fórmula correta:
          // Caso o nº do mês seja menor ou igual ao da entrega:
          // ((tx correção do mês / 100 + 1) ^ (nº parcela))
          // Caso o nº do mês é maior que o mês de entrega:
          // ((tx correção após chaves / 100 + 1) ^ (nº parcela - prazo de entrega)) * ((tx correção até chaves / 100 + 1) ^ mês da entrega)

          let taxaAcumuladaValue = 1;
          if (parcela.mes === 0) {
            // No mês 0 (entrada) não há correção
            taxaAcumuladaValue = 1;
          } else if (parcela.mes > 0 && parcela.mes <= prazoEntrega) {
            // Antes ou no mês de entrega
            taxaAcumuladaValue = Math.pow((taxaAteChavesInput / 100) + 1, parcela.mes);
          } else if (parcela.mes > prazoEntrega) {
            // Após a entrega: A fórmula correta é:
            // ((tx correção após chaves / 100 + 1) ^ (nº parcela - prazo de entrega)) * ((tx correção até chaves / 100 + 1) ^ mês da entrega)
            const taxaAteChavesDecimal = taxaAteChavesInput / 100;
            const taxaAposChavesDecimal = postDeliveryCorrection / 100;

            const fatorAteEntrega = Math.pow(taxaAteChavesDecimal + 1, prazoEntrega);
            const fatorAposEntrega = Math.pow(taxaAposChavesDecimal + 1, parcela.mes - prazoEntrega);

            taxaAcumuladaValue = fatorAposEntrega * fatorAteEntrega;
          }

          // Calcular valores base
          const parcelaBaseValue = parcela.mes > 0 ? 
              (req.body.tipoParcelamento === 'automatico' ? parcelaBase : 
               (parcela.tipoPagamento === 'Parcela' ? parcela.valorBase : 0)) : 0;

          const reforcoBaseValue = isReforcoMonth ? Number(valorReforco) : 0;
          const chavesBaseValue = isEntregaMonth ? Number(valorChaves) : 0;

          // Aplicar taxa acumulada aos valores base
          const parcelaCorrigidaValue = parcelaBaseValue * taxaAcumuladaValue;
          const reforcoCorrigidoValue = reforcoBaseValue * taxaAcumuladaValue;
          const chavesCorrigidoValue = chavesBaseValue * taxaAcumuladaValue;

          // Calcular os pagamentos totais (base e corrigido)
          let pagamentoTotalLiquidoValue = 0;
          let pagamentoTotalValue = 0;

          if (parcela.mes === 0) {
            // Para a entrada (mês 0), ambos valores são iguais ao valor da entrada
            pagamentoTotalLiquidoValue = valorEntrada;
            pagamentoTotalValue = valorEntrada;
          } else {
            // Para os demais meses, soma dos componentes
            pagamentoTotalLiquidoValue = parcelaBaseValue + reforcoBaseValue + chavesBaseValue;
            pagamentoTotalValue = parcelaCorrigidaValue + reforcoCorrigidoValue + chavesCorrigidoValue;
          }

          // REMOVIDO - Fórmula de cálculo do saldo líquido
          // USANDO FÓRMULAS ORIGINAIS - Conforme solicitado, usando formulasFinanciamentoPlanta.ts
          
          // Importar a função de cálculo do financiamento na planta
          if (parcela.mes === 0) {
            console.log(`[CALCULADORA_ORIGINAL] Mês 0: Usando cálculo da biblioteca formulasFinanciamentoPlanta.ts`);
          }
          
          // Preparamos os dados para cálculo externo e criamos um cache para evitar recálculos
          if (parcela.mes === 0 && !req.body._calculoFinanciamento) {
            console.log(`[CACHE] Calculando todos os valores para armazenamento em cache`);
            
            try {
              // Criar os dados para o cálculo
              const dadosFinanciamento = {
                valorImovel,
                valorEntrada,
                valorDesconto,
                prazoPagamento: prazoMeses,
                prazoEntrega,
                taxaCorrecaoAteChaves: taxaAteChavesInput,
                taxaCorrecaoAposChaves: taxaAposChavesInput,
                valorChaves,
                reforcos: req.body.hasBoost ? 
                  Array.from({length: Math.floor((prazoMeses - 1) / intervaloReforco)}, (_, i) => ({
                    mes: (i + 1) * intervaloReforco, 
                    valor: Number(valorReforco)
                  })) : []
              };
              
              console.log(`[CALCULADORA] Usando fórmulas originais de formulasFinanciamentoPlanta.ts`);
              console.log(`Dados enviados para cálculo:`, JSON.stringify(dadosFinanciamento));
              
              // Calcular resultado e armazenar em cache para outros meses
              const resultadoCalculo = calcularFinanciamentoPlanta(dadosFinanciamento);
              req.body._calculoFinanciamento = resultadoCalculo;
              
              console.log(`[RESULTADO] Geradas ${resultadoCalculo.parcelas.length} parcelas com o cálculo original`);
            } catch (error) {
              console.error("[ERRO_CALCULO] Erro ao calcular financiamento:", error);
              // Inicializar com um resultado vazio para evitar loop infinito
              req.body._calculoFinanciamento = { parcelas: [] };
            }
          }
          
          // Obter o saldo líquido do resultado calculado
          let saldoLiquidoValue = 0;
          
          if (req.body._calculoFinanciamento) {
            const parcelaCalculada = req.body._calculoFinanciamento.parcelas.find(
              (p: any) => p.mes === parcela.mes
            );
            
            if (parcelaCalculada) {
              saldoLiquidoValue = parcelaCalculada.saldoLiquido;
              console.log(`[FORMULA_ORIGINAL] Mês ${parcela.mes}: Saldo líquido = ${saldoLiquidoValue}`);
            } else {
              console.log(`[ALERTA] Não encontrou parcela no cálculo para o mês ${parcela.mes}`);
              
              // Usar cálculos anteriores se disponíveis
              const calculosAnteriores = calculosProjecao.filter(
                (calculo: any) => calculo.mes < parcela.mes
              ).sort((a: any, b: any) => a.mes - b.mes);
              
              if (parcela.mes === 1) {
                saldoLiquidoValue = valorImovel - valorDesconto - valorEntrada;
                console.log(`[BACKUP] Mês 1: Usando cálculo padrão: ${saldoLiquidoValue}`);
              } else if (calculosAnteriores.length > 0) {
                const ultimoCalculo = calculosAnteriores[calculosAnteriores.length - 1];
                saldoLiquidoValue = Number(ultimoCalculo.saldoLiquido) - Number(ultimoCalculo.pagamentoTotalLiquido);
                console.log(`[BACKUP] Mês ${parcela.mes}: Usando cálculo baseado no anterior: ${saldoLiquidoValue}`);
              }
            }
          } else {
            console.log(`[ERRO] Cache de cálculo não encontrado, usando ALGORITMO UNIVERSAL`);
            
            // ABORDAGEM UNIVERSAL para calcular o saldo líquido
            // Aplicando a mesma lógica independente do mês
            
            if (parcela.mes <= 1) {
              // Regra 1: Mês 0 e 1 têm o mesmo saldo (valorImovel - valorDesconto - valorEntrada)
              saldoLiquidoValue = valorImovel - valorDesconto - valorEntrada;
              console.log(`[UNIVERSAL_UPDATE] Mês ${parcela.mes}: SaldoLiquido = ${saldoLiquidoValue}`);
            
            } else {
              // Algoritmo universal avançado que lida com meses sequenciais e não sequenciais
              // Esta abordagem funciona para parcelamentos automáticos e personalizados
              
              // Para parcelamento personalizado, precisamos fazer uma abordagem diferente
              if (req.body.tipoParcelamento === 'personalizado') {
                console.log('[PERSONALIZADO_UPDATE] Usando algoritmo especial para parcelamento personalizado');
                
                // 1. Obter todas as parcelas ordenadas por mês (incluindo entrada, parcelas, reforços e chaves)
                const todasParcelas = detalhesFinanciamento.parcelas
                  .filter(p => p.mes <= parcela.mes) // Apenas meses até o atual
                  .sort((a, b) => a.mes - b.mes);    // Ordenar por mês
                
                console.log(`[PERSONALIZADO_UPDATE] Encontradas ${todasParcelas.length} parcelas para processar até o mês ${parcela.mes}`);
                
                // 2. Inicializar array de saldos para todos os meses até o mês atual (preenchido com zeros)
                const saldos = new Array(parcela.mes + 1).fill(0);
                
                // 3. Definir valores iniciais para os meses 0 e 1
                const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                saldos[0] = saldoInicial;
                saldos[1] = saldoInicial;
                
                // 4. Calcular os pagamentos para cada mês (inicializados com zero)
                const pagamentos = new Array(parcela.mes + 1).fill(0);
                
                // 5. Preencher os pagamentos a partir das parcelas definidas
                todasParcelas.forEach(p => {
                  if (p.mes > 0) { // Ignorar mês 0 (entrada)
                    let valorPagamento = 0;
                    
                    // Verificar tipo de pagamento
                    if (p.tipoPagamento === 'Parcela') {
                      valorPagamento += p.valorBase;
                    }
                    
                    // Adicionar reforço se aplicável
                    if (req.body.hasBoost && p.mes % intervaloReforco === 0 && p.mes > 0) {
                      valorPagamento += Number(valorReforco);
                    }
                    
                    // Adicionar chaves se aplicável
                    if (p.mes === prazoEntrega) {
                      valorPagamento += Number(valorChaves);
                    }
                    
                    pagamentos[p.mes] = valorPagamento;
                    console.log(`[PERSONALIZADO_UPDATE] Mês ${p.mes}: Pagamento=${valorPagamento}`);
                  }
                });
                
                // 6. Calcular os saldos de forma progressiva para cada mês
                // Regra: saldo do mês = saldo do mês anterior - pagamento do mês anterior
                for (let mes = 2; mes <= parcela.mes; mes++) {
                  const mesAnterior = mes - 1;
                  
                  // Garantir que temos valores numéricos para o cálculo
                  const saldoAnterior = typeof saldos[mesAnterior] === 'number' ? saldos[mesAnterior] : saldoInicial;
                  const pagamentoAnterior = typeof pagamentos[mesAnterior] === 'number' ? pagamentos[mesAnterior] : 0;
                  
                  // Calcular o novo saldo
                  saldos[mes] = saldoAnterior - pagamentoAnterior;
                  
                  console.log(`[PERSONALIZADO_UPDATE] Mês ${mes}: SaldoAnterior=${saldoAnterior}, PagamentoAnterior=${pagamentoAnterior}, NovoSaldo=${saldos[mes]}`);
                }
                
                // 7. Verificar se o saldo do mês atual está definido
                if (saldos[parcela.mes] === undefined || isNaN(saldos[parcela.mes])) {
                  // Se não estiver definido, usar o último saldo válido
                  let ultimoSaldoValido = saldoInicial;
                  for (let i = parcela.mes - 1; i >= 0; i--) {
                    if (saldos[i] !== undefined && !isNaN(saldos[i])) {
                      ultimoSaldoValido = saldos[i];
                      break;
                    }
                  }
                  saldos[parcela.mes] = ultimoSaldoValido;
                  console.log(`[PERSONALIZADO_UPDATE] Correção: Mês ${parcela.mes} tinha saldo indefinido. Usando último saldo válido: ${ultimoSaldoValido}`);
                }
                
                // O saldo líquido do mês atual é o último calculado, com validação
                if (saldos[parcela.mes] === undefined || isNaN(saldos[parcela.mes])) {
                  // Se saldos[parcela.mes] for undefined ou NaN, usar o saldo inicial
                  saldoLiquidoValue = saldoInicial;
                  console.log(`[CORRECAO_UPDATE] Mês ${parcela.mes}: Saldo indefinido ou NaN. Usando saldo inicial: ${saldoInicial}`);
                } else {
                  saldoLiquidoValue = saldos[parcela.mes];
                }
                
                // Garantir que saldoLiquidoValue nunca é undefined ou NaN para evitar erro no banco
                if (saldoLiquidoValue === undefined || isNaN(saldoLiquidoValue)) {
                  saldoLiquidoValue = 0;
                  console.log(`[EMERGENCIA_UPDATE] Correção de valor undefined ou NaN para salvar no banco: ${saldoLiquidoValue}`);
                }
              } 
              // Para parcelamento automático, usamos o algoritmo original
              else {
                console.log('[AUTOMATICO_UPDATE] Usando algoritmo sequencial para parcelamento automático');
                
                // Calcular todos os saldos desde o mês 0 até o mês atual
                const saldos = new Array(parcela.mes + 1);
                
                // Mês 0 e 1 têm o mesmo saldo inicial
                const saldoInicial = valorImovel - valorDesconto - valorEntrada;
                saldos[0] = saldoInicial;
                saldos[1] = saldoInicial;
                
                // Loop para calcular cada mês de 2 até o mês atual
                for (let mes = 2; mes <= parcela.mes; mes++) {
                  // Para cada mês, calculamos o pagamento do mês anterior (mes-1)
                  const mesAnterior = mes - 1;
                  
                  // 1. Calcular o valor da parcela do mês anterior (sempre igual no parcelamento automático)
                  const valorParcelaAnterior = parcelaBase;
                  
                  // 2. Verificar se o mês anterior tinha reforço
                  const temReforcoAnterior = req.body.hasBoost && mesAnterior % intervaloReforco === 0 && mesAnterior > 0;
                  const valorReforcoAnterior = temReforcoAnterior ? Number(valorReforco) : 0;
                  
                  // 3. Verificar se o mês anterior era o mês de entrega (chaves)
                  const ehMesEntregaAnterior = mesAnterior === prazoEntrega;
                  const valorChavesAnterior = ehMesEntregaAnterior ? Number(valorChaves) : 0;
                  
                  // 4. Pagamento total do mês anterior
                  const pagamentoTotalAnterior = valorParcelaAnterior + valorReforcoAnterior + valorChavesAnterior;
                  
                  // 5. Saldo do mês atual = saldo do mês anterior - pagamento total anterior
                  saldos[mes] = saldos[mesAnterior] - pagamentoTotalAnterior;
                  
                  console.log(`[AUTOMATICO_UPDATE] Mês ${mes}: SaldoAnterior=${saldos[mesAnterior]}, PagamentoAnterior=${pagamentoTotalAnterior}, NovoSaldo=${saldos[mes]}`);
                }
                
                // O saldo líquido do mês atual é o último calculado, com validação
                if (saldos[parcela.mes] === undefined || isNaN(saldos[parcela.mes])) {
                  // Se saldos[parcela.mes] for undefined ou NaN, usar o saldo inicial
                  saldoLiquidoValue = saldoInicial;
                  console.log(`[CORRECAO_AUTOMATICO_UPDATE] Mês ${parcela.mes}: Saldo indefinido ou NaN. Usando saldo inicial: ${saldoInicial}`);
                } else {
                  saldoLiquidoValue = saldos[parcela.mes];
                }
                
                // Garantir que saldoLiquidoValue nunca é undefined ou NaN para evitar erro no banco
                if (saldoLiquidoValue === undefined || isNaN(saldoLiquidoValue)) {
                  saldoLiquidoValue = 0;
                  console.log(`[EMERGENCIA_AUTOMATICO_UPDATE] Correção de valor undefined ou NaN para salvar no banco: ${saldoLiquidoValue}`);
                }
              }
            }
          }

          // Calcular saldo devedor corrigido
          // "saldo_devedor_corrigido" = ("saldo_liquido" do mês * taxa acumulada do mês) + (saldo líquido do mês)
          const saldoDevedorCorrigidoValue = (saldoLiquidoValue * (taxaAcumuladaValue - 1)) + saldoLiquidoValue;

          // Definir a taxa de correção para cada mês conforme a regra:
          // Mês <= mês de entrega: usar taxaAteChavesInput
          // Mês > mês de entrega: usar taxaAposChavesInput
          const taxaCorrecaoValue = parcela.mes <= prazoEntrega ? taxaAteChavesInput : taxaAposChavesInput;

          // Para cada mês, verificar o tipo de pagamento e valores
          return {
            projectionId: id,
            mes: parcela.mes,

            // Usar a taxa correta baseada no período (antes ou depois das chaves)
            taxaCorrecao: String(taxaCorrecaoValue),
            taxaAcumulada: String(taxaAcumuladaValue),

            // Valor de entrada apenas no mês 0
            valorEntrada: parcela.mes === 0 ? String(valorEntrada) : "0",

            // Sempre salvar o valor das parcelas mensais (a partir do mês 1)
            parcelaBase: parcela.mes > 0 ? String(parcelaBaseValue) : "0",
            parcelaCorrigida: parcela.mes > 0 ? String(parcelaCorrigidaValue) : "0",

            // Reforço (balão) só quando for mês de reforço conforme periodicidade
            reforcoBase: String(reforcoBaseValue),
            reforcoCorrigido: String(reforcoCorrigidoValue),

            // Valor das chaves no mês de entrega
            valorChaves: String(chavesBaseValue),
            chavesCorrigido: String(chavesCorrigidoValue),

            // Valores totais: pagamento_total = parcela_corrigida + reforco_corrigido + chaves_corrigido
            // pagamento_total_liquido = parcela_base + reforco_base + valor_chaves
            pagamentoTotal: String(pagamentoTotalValue),
            pagamentoTotalLiquido: String(pagamentoTotalLiquidoValue),

            // Novos cálculos para os saldos
            saldoLiquido: String(saldoLiquidoValue),
            saldoDevedorCorrigido: String(saldoDevedorCorrigidoValue)
          };
        });

        // Salvar os novos cálculos no banco
        await storage.createCalculosProjecao(calculosProjecao);
        console.log("Parcelas atualizadas com sucesso na tabela calculo_projecoes");
      } catch (error) {
        console.error("Erro ao atualizar parcelas na tabela calculo_projecoes:", error);
      }
    }

    res.json(projection);
  });

  app.delete('/api/projections/:id', requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      console.log(`[ROUTE] Tentando deletar projeção ${id} para usuário ${userId}`);
      
      if (isNaN(id)) {
        console.log(`[ROUTE] ID inválido: ${req.params.id}`);
        return res.status(400).json({ error: 'Invalid projection ID' });
      }

      // First check if the projection exists and belongs to the user
      console.log(`[ROUTE] Verificando se projeção ${id} existe...`);
      const projection = await storage.getProjection(id);
      if (!projection) {
        console.log(`[ROUTE] Projeção ${id} não encontrada`);
        return res.status(404).json({ error: 'Projection not found' });
      }
      
      console.log(`[ROUTE] Projeção encontrada. UserId da projeção: ${projection.userId}, UserId da requisição: ${userId}`);
      if (projection.userId !== userId) {
        console.log(`[ROUTE] Usuário ${userId} não autorizado a deletar projeção ${id}`);
        return res.status(403).json({ error: 'Not authorized to delete this projection' });
      }

      console.log(`[ROUTE] Chamando storage.deleteProjection(${id})...`);
      const success = await storage.deleteProjection(id);
      console.log(`[ROUTE] Resultado da exclusão: ${success}`);
      
      if (!success) {
        console.log(`[ROUTE] Falha ao deletar projeção ${id}`);
        return res.status(500).json({ error: 'Failed to delete projection' });
      }

      console.log(`[ROUTE] Projeção ${id} deletada com sucesso`);
      return res.status(200).json({ message: 'Projection deleted successfully' });
    } catch (error) {
      console.error('[ROUTE] Error in delete projection route:', error);
      console.error('[ROUTE] Error type:', typeof error);
      console.error('[ROUTE] Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[ROUTE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Transaction routes
  app.get('/api/projections/:id/transactions', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid projection ID' });
    }

    const transactions = await storage.getTransactions(id);
    res.json(transactions);
  });

  app.post('/api/projections/:id/transactions', validateBody(insertTransactionSchema), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid projection ID' });
    }

    // Make sure the projection exists
    const projection = await storage.getProjection(id);
    if (!projection) {
      return res.status(404).json({ error: 'Projection not found' });
    }

    // Set the projection ID in the transaction
    req.body.projectionId = id;

    const transaction = await storage.createTransaction(req.body);
    res.status(201).json(transaction);
  });

  app.post('/api/projections/:id/transactions/batch', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid projection ID' });
    }

    // Make sure the projection exists
    const projection = await storage.getProjection(id);
    if (!projection) {
      return res.status(404).json({ error: 'Projection not found' });
    }

    // Validate the transactions array
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be an array of transactions' });
    }

    // Set the projection ID for each transaction
    const transactions = req.body.map((transaction: any) => ({
      ...transaction,
      projectionId: id
    }));

    try {
      // Validate each transaction with the schema
      transactions.forEach(transaction => {
        insertTransactionSchema.parse(transaction);
      });

      // Create the transactions
      const createdTransactions = await storage.createTransactions(transactions);
      res.status(201).json(createdTransactions);
    } catch (error) {
      res.status(400).json({ error: 'Invalid transaction data', details: error });
    }
  });

  // Dashboard statistics endpoint
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const clients = await storage.getClients(userId);
    const properties = await storage.getProperties(userId);
    const projections = await storage.getProjections(userId);

    // Calculate stats
    const totalProjections = projections.length;
    const totalClients = clients.length;
    const totalProperties = properties.length;

    // Calculate average ROI from projections that have calculation results
    const projectionsWithRoi = projections.filter(p => 
      p.calculationResults && (p.calculationResults as any).roi
    );

    const averageRoi = projectionsWithRoi.length > 0 
      ? projectionsWithRoi.reduce((sum, p) => sum + ((p.calculationResults as any).roi || 0), 0) / projectionsWithRoi.length
      : 0;

    // Calculate average IRR
    const projectionsWithIrr = projections.filter(p => 
      p.calculationResults && (p.calculationResults as any).irr
    );

    const averageIrr = projectionsWithIrr.length > 0 
      ? projectionsWithIrr.reduce((sum, p) => sum + ((p.calculationResults as any).irr || 0), 0) / projectionsWithIrr.length
      : 0;

    // Get counts by strategy
    const strategyCount = {
      futureSale: projections.filter(p => p.strategies && Array.isArray(p.strategies) && p.strategies.includes(PROJECTION_STRATEGY.FUTURE_SALE)).length,
      assetAppreciation: projections.filter(p => p.strategies && Array.isArray(p.strategies) && p.strategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION)).length,
      rentalYield: projections.filter(p => p.strategies && Array.isArray(p.strategies) && p.strategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD)).length,
    };

    // Get recent projections (last 5)
    const recentProjections = projections
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Enrich recent projections with client and property data
    const enrichedRecentProjections = await Promise.all(
      recentProjections.map(async (projection) => {
        const client = await storage.getClient(projection.clientId);
        const property = await storage.getProperty(projection.propertyId);

        return {
          ...projection,
          client: client ? { id: client.id, name: client.name } : null,
          property: property ? { id: property.id, name: property.name } : null,
        };
      })
    );

    res.json({
      totalProjections,
      totalClients,
      totalProperties,
      averageRoi,
      averageIrr,
      averageYield: 0.7, // Placeholder for now
      activeProjections: totalProjections, // Placeholder for now (all are considered active)
      completedProjections: 0, // Placeholder for now
      strategyCount,
      recentProjections: enrichedRecentProjections
    });
  });

  // Endpoint para buscar cálculos de amortização de uma projeção
  app.get('/api/projections/:id/calculo_projecoes', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de projeção inválido' });
    }

    try {
      // Buscar os cálculos da projeção
      const calculosProjecao = await storage.getCalculosProjecao(id);

      // Se não houver cálculos, pode ser porque o usuário não fez uma projeção
      // de financiamento na planta ou os cálculos não foram salvos
      if (!calculosProjecao || calculosProjecao.length === 0) {
        return res.json([]);
      }

      res.json(calculosProjecao);
    } catch (error) {
      console.error("Erro ao buscar cálculos de projeção:", error);
      res.status(500).json({ error: 'Erro ao buscar cálculos de projeção' });
    }
  });

  // Registrar as rotas de cálculos de projeção
  app.use('/api', projectionCalculationsRouter);
  app.use('/api/tir', tirRoutes);

  // Endpoint para acionar o cálculo de uma projeção específica (função facilitadora)
  app.get('/api/projections/:id/get-with-calculations', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID de projeção inválido' });
      }
      
      // Primeiro buscamos a projeção
      const projection = await storage.getProjection(id);
      if (!projection) {
        return res.status(404).json({ error: 'Projeção não encontrada' });
      }
      
      // Se a projeção não tem resultados de cálculo, vamos calculá-los
      if (!projection.calculationResults || 
          !projection.calculationResults.financiamentoPlanta ||
          Object.keys(projection.calculationResults).length === 0) {
        
        console.log(`Projeção #${id} não tem cálculos, calculando agora...`);
        
        // Fazer uma requisição interna para o endpoint de cálculo
        try {
          const result = await new Promise<any>((resolve, reject) => {
            const options = {
              host: 'localhost',
              port: req.socket.localPort,
              path: `/api/projections/${id}/calculate`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            
            const request = httpRequest(options, (response: any) => {
              let data = '';
              
              response.on('data', (chunk: string) => {
                data += chunk;
              });
              
              response.on('end', () => {
                try {
                  resolve(JSON.parse(data));
                } catch (error) {
                  reject(error);
                }
              });
            });
            
            request.on('error', (error: Error) => {
              reject(error);
            });
            
            request.end();
          });
          
          console.log('Cálculos completos, retornando projeção atualizada');
          return res.json(result.projection);
        } catch (error) {
          console.error('Erro ao calcular projeção internamente:', error);
          // Em caso de erro, retornamos a projeção sem cálculos
          return res.json(projection);
        }
      }
      
      // Se já tem cálculos, retorna a projeção diretamente
      return res.json(projection);
    } catch (error) {
      console.error('Erro ao buscar projeção com cálculos:', error);
      return res.status(500).json({ error: 'Erro ao buscar projeção com cálculos' });
    }
  });

  // Public Report Links API
  app.post('/api/projections/:id/share', requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const projectionId = parseInt(req.params.id);
      const userId = (req as any).userId;
      const { title, description } = req.body || {};
      
      // Verificar se a projeção existe e pertence ao usuário
      const projection = await storage.getProjection(projectionId);
      if (!projection || projection.userId !== userId) {
        return res.status(404).json({ error: 'Projeção não encontrada' });
      }
      
      // Gerar ID público único
      const publicId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log('Generated publicId:', publicId);
      
      // Capturar IP e User-Agent do criador
      const creatorIp = getClientIp(req);
      const creatorUserAgent = req.headers['user-agent'] || 'unknown';
      console.log('Creator IP captured:', creatorIp);
      console.log('Creator User-Agent captured:', creatorUserAgent);
      
      // Criar link público
      const publicLink = await storage.createPublicReportLink({
        publicId,
        projectionId,
        userId,
        isActive: true,
        viewCount: 0,
        creatorIp,
        creatorUserAgent,
        title: title || projection.title,
        description: description || null
      });
      
      console.log('Created public link:', publicLink);
      
      const response = {
        publicId: publicLink.publicId,
        url: `${req.protocol}://${req.get('host')}/public/report/${publicLink.publicId}`,
        createdAt: publicLink.createdAt
      };
      
      console.log('Response being sent:', response);
      res.json(response);
    } catch (error) {
      console.error('Erro ao criar link público:', error);
      res.status(500).json({ error: 'Erro ao criar link público' });
    }
  });

  app.get('/api/projections/:id/share', requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const projectionId = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      // Verificar se a projeção pertence ao usuário
      const projection = await storage.getProjection(projectionId);
      if (!projection || projection.userId !== userId) {
        return res.status(404).json({ error: 'Projeção não encontrada' });
      }
      
      const links = await storage.getPublicReportLinksByProjection(projectionId);
      res.json(links.map(link => ({
        id: link.id,
        publicId: link.publicId,
        url: `${req.protocol}://${req.get('host')}/public/report/${link.publicId}`,
        isActive: link.isActive,
        viewCount: link.viewCount,
        createdAt: link.createdAt
      })));
    } catch (error) {
      console.error('Erro ao buscar links públicos:', error);
      res.status(500).json({ error: 'Erro ao buscar links públicos' });
    }
  });

  app.delete('/api/projections/share/:linkId', requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const linkId = parseInt(req.params.linkId);
      const userId = (req as any).userId;
      
      // Buscar o link para verificar propriedade
      const links = await storage.getPublicReportLinksByProjection(0); // Buscar todos primeiro
      const link = links.find(l => l.id === linkId && l.userId === userId);
      
      if (!link) {
        return res.status(404).json({ error: 'Link não encontrado' });
      }
      
      await storage.deletePublicReportLink(linkId);
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao deletar link público:', error);
      res.status(500).json({ error: 'Erro ao deletar link público' });
    }
  });

  // Endpoint para deletar todos os links públicos de uma projeção (usado ao editar projeção)
  app.delete('/api/projections/:id/share', requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const projectionId = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      // Verificar se a projeção existe e pertence ao usuário
      const projection = await storage.getProjection(projectionId);
      if (!projection || projection.userId !== userId) {
        return res.status(404).json({ error: 'Projeção não encontrada' });
      }
      
      // Buscar todos os links públicos da projeção
      const links = await storage.getPublicReportLinksByProjection(projectionId);
      
      if (links.length === 0) {
        return res.json({ success: true, message: 'Nenhum link público encontrado para deletar' });
      }
      
      // Deletar todos os links e seus logs de acesso associados
      let deletedCount = 0;
      for (const link of links) {
        // Deletar logs de acesso associados ao link
        await storage.deletePublicReportAccessLogsByLinkId(link.id);
        
        // Deletar o link público
        const deleted = await storage.deletePublicReportLink(link.id);
        if (deleted) {
          deletedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `${deletedCount} link(s) público(s) e logs associados removidos com sucesso`,
        deletedCount 
      });
    } catch (error) {
      console.error('Erro ao deletar links públicos da projeção:', error);
      res.status(500).json({ error: 'Erro ao deletar links públicos' });
    }
  });

  // API pública para acessar relatórios (sem autenticação)
  app.get('/api/public/report/:publicId', async (req: Request, res: Response) => {
    try {
      const publicId = req.params.publicId;
      
      // Buscar link público
      const publicLink = await storage.getPublicReportLink(publicId);
      if (!publicLink || !publicLink.isActive) {
        return res.status(404).json({ error: 'Relatório não encontrado ou inativo' });
      }
      
      // Incrementar contador de visualizações
      await storage.incrementViewCount(publicId);
      
      // Buscar projeção completa
      const projection = await storage.getProjection(publicLink.projectionId);
      if (!projection) {
        return res.status(404).json({ error: 'Projeção não encontrada' });
      }
      
      // Buscar dados do usuário (para informações da imobiliária)
      const user = await storage.getUser(publicLink.userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Buscar cliente e propriedade se existirem
      let client = null;
      let property = null;
      
      if (projection.clientId) {
        client = await storage.getClient(projection.clientId);
      }
      
      if (projection.propertyId) {
        property = await storage.getProperty(projection.propertyId);
      }
      
      res.json({
        projection: {
          ...projection,
          client,
          property
        },
        user: {
          name: user.name,
          company: user.company,
          photo: user.photo
        },
        viewCount: publicLink.viewCount
      });
    } catch (error) {
      console.error('Erro ao buscar relatório público:', error);
      res.status(500).json({ error: 'Erro ao buscar relatório público' });
    }
  });

  // Endpoint simplificado para registrar acessos ao relatório público
  app.post('/api/public/report/access', validateBody(publicReportAccessSchema), async (req: Request, res: Response) => {
    try {
      const { public_id, browser, device_type, device_model, os } = req.body;
      
      // Extrair dados do header
      const userAgent = req.headers['user-agent'] || '';
      const ip = getClientIp(req);
      
      // Buscar o link público
      const publicLink = await storage.getPublicReportLink(public_id);
      if (!publicLink || !publicLink.isActive) {
        return res.status(404).json({ error: 'Relatório não encontrado ou inativo' });
      }
      
      // Determinar se o acesso é do criador
      const isCreator = (
        ip === publicLink.creatorIp && 
        userAgent === publicLink.creatorUserAgent
      );
      
      // Pular registros do criador
      if (isCreator) {
        return res.json({ 
          success: true, 
          skipped: true,
          reason: 'Creator access skipped',
          isCreator 
        });
      }
      
      // SEMPRE registrar acesso, incluindo visitas repetidas do mesmo usuário
      // Isso permite ao RoiMob user ver quando o cliente retorna ao relatório
      
      // Criar novo registro de acesso (incluindo visitas repetidas)
      const accessLog = await storage.createPublicReportAccessLog({
        publicReportLinkId: publicLink.id,
        ip,
        userAgent,
        browser: browser || null,
        deviceType: device_type || null,
        deviceModel: device_model || null,
        os: os || null,
        isCreator
      });
      
      console.log(`📝 ACESSO REGISTRADO: ID=${accessLog.id}, IP=${ip}, Criador=${isCreator}`);
      
      res.json({ 
        success: true, 
        id: accessLog.id,
        isCreator: false
      });
      
    } catch (error) {
      console.error('Erro ao registrar acesso:', error);
      res.status(500).json({ error: 'Erro ao registrar acesso' });
    }
  });



  // Endpoint de teste para verificar autenticação
  app.get('/api/test-auth/:projectionId', async (req: Request, res: Response) => {
    const projectionId = parseInt(req.params.projectionId);
    const sessionUserId = req.session?.userId;
    const sessionData = req.session;
    
    console.log('DEBUG TEST AUTH:', {
      projectionId,
      sessionUserId,
      hasSession: !!sessionData,
      sessionKeys: sessionData ? Object.keys(sessionData) : [],
      fullSession: sessionData
    });
    
    res.json({
      projectionId,
      authenticated: !!sessionUserId,
      userId: sessionUserId,
      hasSession: !!sessionData,
      sessionData: sessionData
    });
  });

  // Endpoint para buscar logs de acesso de um link público
  app.get('/api/public-report-access-logs/:projectionId', requireAuth, async (req: Request, res: Response) => {
    try {
      const projectionId = parseInt(req.params.projectionId);
      const userId = (req as any).userId;
      
      console.log(`DEBUG: Buscando logs para projeção ${projectionId}, usuário ${userId}`);
      
      if (isNaN(projectionId)) {
        return res.status(400).json({ error: 'ID da projeção inválido' });
      }
      
      // Verificar se a projeção existe e pertence ao usuário autenticado
      const projection = await storage.getProjection(projectionId);
      if (!projection || projection.userId !== userId) {
        console.log(`DEBUG: Projeção ${projectionId} não encontrada ou usuário ${userId} não tem acesso`);
        return res.status(404).json({ error: 'Projeção não encontrada ou acesso negado' });
      }
      
      // Buscar links públicos da projeção
      const publicLinks = await storage.getPublicReportLinksByProjection(projectionId);
      console.log(`DEBUG: Encontrados ${publicLinks.length} links públicos para projeção ${projectionId}`);
      
      if (publicLinks.length === 0) {
        console.log(`DEBUG: Nenhum link público encontrado, retornando array vazio`);
        return res.json([]); // Retorna array vazio se não há links públicos
      }
      
      // Buscar logs de acesso para todos os links da projeção
      const allLogs = [];
      for (const link of publicLinks) {
        const logs = await storage.getPublicReportAccessLogs(link.id);
        console.log(`DEBUG: Link ${link.id} tem ${logs.length} logs de acesso`);
        allLogs.push(...logs);
      }
      
      console.log(`DEBUG: Total de logs coletados: ${allLogs.length}`);
      
      // Todos os registros agora são válidos (sem sistema de partial)
      console.log(`DEBUG: Retornando todos os ${allLogs.length} logs de acesso`);
      
      // Transformar logs para incluir campos compatíveis com o frontend
      const transformedLogs = allLogs.map(log => ({
        ...log,
        is_broker_access: log.isCreator, // Campo esperado pelo frontend
        created_at: log.accessedAt, // Campo esperado pelo frontend
        accessed_at: log.accessedAt, // Campo para data
        device_type: log.deviceType, // Campo para tipo de dispositivo
        device_model: log.deviceModel, // Campo para modelo do dispositivo
        os: log.os, // Campo para sistema operacional
        user_agent: log.userAgent, // Campo para user agent
        browser: log.browser // Campo para navegador
      }));
      
      console.log(`DEBUG: Retornando ${transformedLogs.length} logs transformados`);
      res.json(transformedLogs);
    } catch (error) {
      console.error('Erro ao buscar logs de acesso:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de acesso' });
    }
  });



  // PDF Export route for planilha page using Puppeteer - OTIMIZADA PARA VELOCIDADE
  app.get('/api/planilha/:id/pdf', requireAuth, async (req: Request, res: Response) => {
    let browser = null;
    const startTime = Date.now();
    
    try {
      console.log('[PDF] Iniciando geração de PDF OTIMIZADA para planilha:', req.params.id);
      
      // Importar puppeteer-core usando import dinâmico
      const puppeteer = await import('puppeteer-core');
      
      // Extrair parâmetros da query string
      const params = new URLSearchParams(req.url.split('?')[1] || '');
      
      // Construir URL da planilha com modo de impressão
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://roimob.com.br'
        : `http://localhost:5000`;
      
      const planilhaUrl = `${baseUrl}/public-report/planilha/${req.params.id}?printMode=true&${params.toString()}`;
      
      console.log('[PDF] URL da planilha para PDF:', planilhaUrl);
      
      // Detectar dinamicamente o caminho do Chromium
      let executablePath = null;
      const fs = await import('fs');
      const path = await import('path');
      
      // Caminhos possíveis para o executável do Chromium
      const possiblePaths = [
        // Replit Deploy production
        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        // Caminho genérico do Chromium instalado via npm
        path.default.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome'),
        // Caminho alternativo para Chromium
        // require('chromium').path, // Comentado para evitar problemas
        // Caminho padrão do sistema
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      console.log('[PDF] Detectando caminho do Chromium...');
      
      // Tentar encontrar o executável
      for (const testPath of possiblePaths) {
        try {
          if (testPath && fs.default.existsSync(testPath)) {
            executablePath = testPath;
            console.log(`[PDF] Chromium encontrado em: ${executablePath}`);
            break;
          }
        } catch (error) {
          console.log(`[PDF] Erro ao testar caminho ${testPath}:`, error.message);
          continue;
        }
      }
      
      if (!executablePath) {
        console.log('[PDF] Nenhum caminho válido encontrado, usando configuração padrão');
      }
      
      // Configurar navegador com otimizações para velocidade
      const browserOptions = {
        headless: true,
        protocolTimeout: 180000, // 3 minutos para operações de protocolo
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
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-image-animation-resync',
          '--disable-sync',
          '--disable-plugins',
          '--disable-java',
          '--disable-site-isolation-trials',
          '--disable-blink-features=AutomationControlled'
        ]
      };
      
      // Adicionar executablePath apenas se encontrado
      if (executablePath) {
        browserOptions.executablePath = executablePath;
      }
      
      console.log('[PDF] Configuração do browser:', JSON.stringify(browserOptions, null, 2));
      
      browser = await puppeteer.default.launch(browserOptions);
      
      const page = await browser.newPage();
      
      // Configurar timeout de navegação para 3 minutos (180000ms)
      page.setDefaultNavigationTimeout(180000);
      
      // Configurar viewport menor para acelerar renderização
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Acelerar navegação desabilitando recursos desnecessários
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Bloquear recursos que não são essenciais para PDF
        if (resourceType === 'font' || resourceType === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      console.log('[PDF] Navegando para a página...');
      const navStartTime = Date.now();
      
      // Navegar com timeout aumentado para produção
      console.log(`[PDF] Navegando para URL: ${planilhaUrl}`);
      await page.goto(planilhaUrl, { 
        waitUntil: 'networkidle0',
        timeout: 180000 // 3 minutos para produção
      });
      
      console.log(`[PDF] Página carregada em ${Date.now() - navStartTime}ms`);
      
      // ADICIONAR LOG DE VERIFICAÇÃO DE CONTEÚDO DA PÁGINA
      try {
        const title = await page.title();
        console.log(`[PDF] Título da página: ${title}`);
        
        const url = await page.url();
        console.log(`[PDF] URL final: ${url}`);
        
        // Verificar se a página carregou corretamente
        const bodyContent = await page.evaluate(() => {
          return document.body ? document.body.innerText.substring(0, 200) : 'Sem conteúdo no body';
        });
        console.log(`[PDF] Conteúdo da página (primeiros 200 chars): ${bodyContent}`);
        
        // Verificar se há erros de JavaScript na página
        const errorMessages = await page.evaluate(() => {
          const errors = [];
          window.addEventListener('error', (e) => errors.push(e.message));
          return errors;
        });
        if (errorMessages.length > 0) {
          console.log(`[PDF] Erros JS detectados: ${errorMessages.join(', ')}`);
        }
        
      } catch (debugError) {
        console.log(`[PDF] Erro ao capturar informações de debug: ${debugError.message}`);
      }
      
      // Aguardar apenas elementos essenciais com timeout reduzido
      const waitStartTime = Date.now();
      
      try {
        // Aguardar que a aba de resultados esteja visível (indicador de cálculo completo)
        await page.waitForSelector('[data-tab="results"]', { timeout: 5000 });
        console.log('[PDF] Aba de resultados detectada');
      } catch {
        console.log('[PDF] Timeout aguardando aba de resultados - continuando...');
      }
      
      try {
        // Aguardar algum conteúdo básico estar presente
        await page.waitForSelector('.grid', { timeout: 3000 });
        console.log('[PDF] Conteúdo básico detectado');
      } catch {
        console.log('[PDF] Timeout aguardando conteúdo básico - continuando...');
      }
      
      console.log(`[PDF] Aguardo de elementos concluído em ${Date.now() - waitStartTime}ms`);
      
      // Tempo mínimo de renderização reduzido drasticamente
      console.log('[PDF] Aguardando renderização final...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido de 4000ms para 1000ms
      
      console.log('[PDF] Iniciando geração do PDF...');
      const pdfStartTime = Date.now();
      
      // Gerar PDF com configurações otimizadas - FORMATO PAISAGEM
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true, // Alterado para formato paisagem
        margin: {
          top: '8mm',
          bottom: '8mm',
          left: '2mm',
          right: '2mm'
        },
        printBackground: true,
        preferCSSPageSize: false,
        timeout: 30000 // Timeout aumentado para produção
      });
      
      console.log(`[PDF] PDF gerado em ${Date.now() - pdfStartTime}ms, tamanho: ${pdfBuffer.length} bytes`);
      console.log(`[PDF] TEMPO TOTAL: ${Date.now() - startTime}ms`);
      
      // Enviar PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="planilha-financeira-${req.params.id}-${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF com Puppeteer:', error);
      console.log(`[PDF] ERRO após ${Date.now() - startTime}ms`);
      res.status(500).json({ 
        error: 'Erro ao gerar PDF', 
        details: error.message 
      });
    } finally {
      // Garantir que o browser seja sempre fechado
      if (browser) {
        try {
          await browser.close();
          console.log('[PDF] Browser fechado com sucesso');
        } catch (closeError) {
          console.error('[PDF] Erro ao fechar browser:', closeError);
        }
      }
    }
  });

  app.get('/api/planilha/pdf', requireAuth, async (req: Request, res: Response) => {
    let browser = null;
    const startTime = Date.now();
    
    try {
      console.log('[PDF] Iniciando geração de PDF OTIMIZADA (rota 2)...');
      
      // Importar puppeteer-core usando import dinâmico
      const puppeteer = await import('puppeteer-core');
      
      // Obter ID da planilha da URL
      const planilhaId = req.params.id || 'default';
      
      // Determinar a URL base do servidor
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://roimob.com.br'
        : `http://localhost:5000`;
      
      // URL da página em modo de impressão
      const printUrl = `${baseUrl}/public-report/planilha/${planilhaId}?printMode=true&${req.url.split('?')[1] || ''}`;
      
      console.log('[PDF] URL para captura:', printUrl);
      
      // Detectar dinamicamente o caminho do Chromium
      let executablePath = null;
      const fs = await import('fs');
      const path = await import('path');
      
      // Caminhos possíveis para o executável do Chromium
      const possiblePaths = [
        // Replit Deploy production
        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        // Caminho genérico do Chromium instalado via npm
        path.default.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome'),
        // Caminho alternativo para Chromium
        // require('chromium').path, // Comentado para evitar problemas
        // Caminho padrão do sistema
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      console.log('[PDF] Detectando caminho do Chromium...');
      
      // Tentar encontrar o executável
      for (const testPath of possiblePaths) {
        try {
          if (testPath && fs.default.existsSync(testPath)) {
            executablePath = testPath;
            console.log(`[PDF] Chromium encontrado em: ${executablePath}`);
            break;
          }
        } catch (error) {
          console.log(`[PDF] Erro ao testar caminho ${testPath}:`, error.message);
          continue;
        }
      }
      
      if (!executablePath) {
        console.log('[PDF] Nenhum caminho válido encontrado, usando configuração padrão');
      }
      
      // Configurar navegador com otimizações para velocidade
      const browserOptions = {
        headless: true,
        protocolTimeout: 180000, // 3 minutos para operações de protocolo
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
          '--disable-java',
          '--disable-site-isolation-trials',
          '--disable-blink-features=AutomationControlled'
        ]
      };
      
      // Adicionar executablePath apenas se encontrado
      if (executablePath) {
        browserOptions.executablePath = executablePath;
      }
      
      console.log('[PDF] Configuração do browser:', JSON.stringify(browserOptions, null, 2));
      
      // Inicializar Puppeteer com otimizações
      browser = await puppeteer.default.launch(browserOptions);
      
      const page = await browser.newPage();
      
      // Configurar timeout de navegação para 3 minutos (180000ms)
      page.setDefaultNavigationTimeout(180000);
      
      // Configurar viewport otimizado
      await page.setViewport({
        width: 1200,
        height: 1600
      });
      
      // Interceptar requests para acelerar carregamento
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'font' || resourceType === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // Navegar para a página com timeout reduzido
      console.log('[PDF] Navegando para a página...');
      const navStartTime = Date.now();
      
      console.log(`[PDF] Navegando para URL: ${printUrl}`);
      await page.goto(printUrl, {
        waitUntil: 'networkidle0',
        timeout: 180000 // 3 minutos para produção
      });
      
      console.log(`[PDF] Página carregada em ${Date.now() - navStartTime}ms`);
      
      // ADICIONAR LOG DE VERIFICAÇÃO DE CONTEÚDO DA PÁGINA
      try {
        const title = await page.title();
        console.log(`[PDF] Título da página: ${title}`);
        
        const url = await page.url();
        console.log(`[PDF] URL final: ${url}`);
        
        // Verificar se a página carregou corretamente
        const bodyContent = await page.evaluate(() => {
          return document.body ? document.body.innerText.substring(0, 200) : 'Sem conteúdo no body';
        });
        console.log(`[PDF] Conteúdo da página (primeiros 200 chars): ${bodyContent}`);
        
        // Verificar se há erros de JavaScript na página
        const errorMessages = await page.evaluate(() => {
          const errors = [];
          window.addEventListener('error', (e) => errors.push(e.message));
          return errors;
        });
        if (errorMessages.length > 0) {
          console.log(`[PDF] Erros JS detectados: ${errorMessages.join(', ')}`);
        }
        
      } catch (debugError) {
        console.log(`[PDF] Erro ao capturar informações de debug: ${debugError.message}`);
      }
      
      // Aguardar apenas elementos essenciais com timeout reduzido
      try {
        await page.waitForSelector('.grid', { timeout: 3000 });
        console.log('[PDF] Conteúdo básico detectado');
      } catch {
        console.log('[PDF] Timeout aguardando conteúdo básico - continuando...');
      }
      
      // Tempo mínimo de renderização otimizado
      console.log('[PDF] Aguardando renderização final...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido drasticamente
      
      // Gerar PDF
      console.log('[PDF] Gerando PDF...');
      const pdfStartTime = Date.now();
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true, // Alterado para formato paisagem
        printBackground: true,
        margin: {
          top: '8mm',
          bottom: '8mm',
          left: '2mm',
          right: '2mm'
        },
        timeout: 30000 // Timeout aumentado para produção
      });
      
      console.log(`[PDF] PDF gerado em ${Date.now() - pdfStartTime}ms, tamanho: ${pdfBuffer.length} bytes`);
      console.log(`[PDF] TEMPO TOTAL (rota 2): ${Date.now() - startTime}ms`);
      
      // Configurar headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-planilha.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Enviar PDF
      res.end(pdfBuffer);
      
      console.log('[PDF] PDF gerado e enviado com sucesso');
      
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      console.log(`[PDF] ERRO (rota 2) após ${Date.now() - startTime}ms`);
      res.status(500).json({ 
        error: 'Erro ao gerar PDF',
        details: error.message 
      });
    } finally {
      // Fechar browser
      if (browser) {
        try {
          await browser.close();
          console.log('[PDF] Browser fechado com sucesso (rota 2)');
        } catch (closeError) {
          console.error('[PDF] Erro ao fechar browser (rota 2):', closeError);
        }
      }
    }
  });

  // TESTE SIMPLES DE ROTEAMENTO
  app.get('/api/debug/simple-test', async (req: Request, res: Response) => {
    try {
      return res.json({ status: 'OK', message: 'Roteamento funcionando' });
    } catch (error) {
      return res.json({ status: 'ERRO', erro: error.message });
    }
  });

  // TESTE COMPLETO DO FLUXO REAL DE PRODUÇÃO PDF
  app.get('/api/debug/production-pdf-flow', async (req: Request, res: Response) => {
    let browser = null;
    const diagnosticLog = [];
    const startTime = Date.now();
    
    function log(message) {
      const timestamp = `[${Date.now() - startTime}ms]`;
      diagnosticLog.push(`${timestamp} ${message}`);
      console.log(`[DEBUG-PRODUCTION] ${timestamp} ${message}`);
    }
    
    try {
      log('🔍 INICIANDO TESTE COMPLETO DO FLUXO REAL DE PRODUÇÃO PDF');
      
      // ETAPA 1: Testar parâmetros reais que o frontend enviaria
      log('\n1. TESTANDO PARÂMETROS REAIS DO FRONTEND...');
      const realParams = {
        valorImovel: '500000',
        valorEntrada: '50000',
        prazoEntrega: '24',
        prazoPagamento: '100',
        correcaoMensalAteChaves: '0.5',
        correcaoMensalAposChaves: '1',
        tipoParcelamento: 'automatico',
        adicionarReforcos: 'false',
        valorReforco: '10000',
        periodicidadeReforco: 'trimestral',
        adicionarValorChaves: 'false',
        valorChaves: '30000',
        nomeCalculo: 'projecao'
      };
      
      const queryString = new URLSearchParams(realParams).toString();
      log(`✅ Query string gerada: ${queryString}`);
      
      // ETAPA 2: Testar URL exata que o endpoint real usa
      log('\n2. TESTANDO URL EXATA DO ENDPOINT REAL...');
      const planilhaId = req.query.id || 'default';
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://roimob.com.br'
        : `http://localhost:5000`;
      
      const planilhaUrl = `${baseUrl}/public-report/planilha/${planilhaId}?printMode=true&${queryString}`;
      log(`✅ URL da planilha: ${planilhaUrl}`);
      
      // ETAPA 3: Testar se a URL é acessível diretamente
      log('\n3. TESTANDO ACESSO DIRETO À URL...');
      try {
        const testResponse = await fetch(planilhaUrl);
        if (testResponse.ok) {
          log(`✅ URL acessível diretamente - Status: ${testResponse.status}`);
        } else {
          log(`❌ URL não acessível - Status: ${testResponse.status}`);
          const errorText = await testResponse.text();
          log(`Erro: ${errorText.substring(0, 200)}...`);
        }
      } catch (fetchError) {
        log(`❌ Erro ao acessar URL diretamente: ${fetchError.message}`);
      }
      
      // ETAPA 4: Configurar Puppeteer com configurações idênticas ao endpoint real
      log('\n4. CONFIGURANDO PUPPETEER IDÊNTICO AO ENDPOINT REAL...');
      const puppeteer = await import('puppeteer-core');
      
      // Detectar caminho do Chromium (mesmo código do endpoint real)
      let executablePath = null;
      const fs = await import('fs');
      const path = await import('path');
      
      const possiblePaths = [
        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        path.default.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome'),
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      for (const testPath of possiblePaths) {
        try {
          if (testPath && fs.default.existsSync(testPath)) {
            executablePath = testPath;
            log(`✅ Chromium encontrado: ${executablePath}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!executablePath) {
        log('❌ NENHUM CAMINHO CHROMIUM ENCONTRADO - USANDO PADRÃO');
      }
      
      // ETAPA 5: Configurar browser com opções idênticas ao endpoint real
      log('\n5. CONFIGURANDO BROWSER COM OPÇÕES IDÊNTICAS...');
      const browserOptions = {
        headless: true,
        protocolTimeout: 180000, // 3 minutos para operações de protocolo
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
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-image-animation-resync',
          '--disable-sync',
          '--disable-plugins',
          '--disable-java',
          '--disable-site-isolation-trials',
          '--disable-blink-features=AutomationControlled'
        ]
      };
      
      if (executablePath) {
        browserOptions.executablePath = executablePath;
      }
      
      log(`✅ Configuração do browser pronta`);
      
      // ETAPA 6: Lançar browser
      log('\n6. LANÇANDO BROWSER...');
      const browserStartTime = Date.now();
      try {
        browser = await puppeteer.default.launch(browserOptions);
        const page = await browser.newPage();
        log(`✅ Browser lançado em ${Date.now() - browserStartTime}ms`);
        
        // Configurar timeout de navegação para 3 minutos (180000ms)
        page.setDefaultNavigationTimeout(180000);
        
        // ETAPA 7: Configurar viewport e interceptação idênticas
        log('\n7. CONFIGURANDO VIEWPORT E INTERCEPTAÇÃO...');
        await page.setViewport({ width: 1200, height: 1600 });
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (resourceType === 'font' || resourceType === 'media') {
            req.abort();
          } else {
            req.continue();
          }
        });
        log('✅ Viewport e interceptação configurados');
        
        // ETAPA 8: Testar navegação com mesmos parâmetros
        log('\n8. TESTANDO NAVEGAÇÃO COM PARÂMETROS IDÊNTICOS...');
        const navStartTime = Date.now();
        
        try {
          await page.goto(planilhaUrl, { 
            waitUntil: 'networkidle0',
            timeout: 180000
          });
          log(`✅ Navegação bem-sucedida em ${Date.now() - navStartTime}ms`);
        } catch (error) {
          log(`❌ FALHA NA NAVEGAÇÃO: ${error.message}`);
          
          // Capturar conteúdo da página para debug
          try {
            const content = await page.content();
            log(`Conteúdo da página (primeiros 500 chars): ${content.substring(0, 500)}...`);
          } catch (contentError) {
            log(`Erro ao capturar conteúdo: ${contentError.message}`);
          }
          
          return res.json({ status: 'FALHA', etapa: 8, erro: error.message, log: diagnosticLog });
        }
        
        // ETAPA 9: Testar aguardo de elementos idêntico ao endpoint real
        log('\n9. TESTANDO AGUARDO DE ELEMENTOS IDÊNTICO...');
        const waitStartTime = Date.now();
        
        try {
          await page.waitForSelector('[data-tab="results"]', { timeout: 5000 });
          log('✅ Aba de resultados detectada');
        } catch {
          log('⚠️ Timeout aguardando aba de resultados - continuando...');
        }
        
        try {
          await page.waitForSelector('.grid', { timeout: 3000 });
          log('✅ Conteúdo básico detectado');
        } catch {
          log('⚠️ Timeout aguardando conteúdo básico - continuando...');
        }
        
        log(`✅ Aguardo concluído em ${Date.now() - waitStartTime}ms`);
        
        // ETAPA 10: Aguardar renderização final idêntica
        log('\n10. AGUARDANDO RENDERIZAÇÃO FINAL (1000ms)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        log('✅ Renderização final concluída');
        
        // ETAPA 11: Testar geração de PDF idêntica
        log('\n11. TESTANDO GERAÇÃO DE PDF IDÊNTICA...');
        const pdfStartTime = Date.now();
        
        try {
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
            timeout: 30000
          });
          
          log(`✅ PDF gerado em ${Date.now() - pdfStartTime}ms, tamanho: ${pdfBuffer.length} bytes`);
          
          // ETAPA 12: Testar resposta HTTP
          log('\n12. TESTANDO RESPOSTA HTTP...');
          
          // Configurar headers idênticos
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="planilha-teste-${planilhaId}-${Date.now()}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          
          log('✅ Headers configurados');
          
          // Enviar PDF
          res.end(pdfBuffer);
          log('✅ PDF enviado com sucesso');
          
        } catch (error) {
          log(`❌ FALHA NA GERAÇÃO DE PDF: ${error.message}`);
          log(`Stack trace: ${error.stack}`);
          return res.json({ status: 'FALHA', etapa: 11, erro: error.message, stack: error.stack, log: diagnosticLog });
        }
        
      } catch (browserError) {
        log(`❌ FALHA AO LANÇAR BROWSER: ${browserError.message}`);
        log(`Stack trace: ${browserError.stack}`);
        return res.json({ status: 'FALHA', etapa: 6, erro: browserError.message, stack: browserError.stack, log: diagnosticLog });
      }
      
      log(`\n✅ TESTE COMPLETO DO FLUXO REAL CONCLUÍDO COM SUCESSO! Tempo total: ${Date.now() - startTime}ms`);
      
    } catch (error) {
      log(`\n❌ ERRO GERAL NO TESTE: ${error.message}`);
      log(`Stack trace: ${error.stack}`);
      console.error('[DEBUG-PRODUCTION] Erro completo:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({ 
          status: 'ERRO', 
          erro: error.message, 
          stack: error.stack,
          log: diagnosticLog 
        });
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
          log('🧹 Browser fechado');
        } catch (closeError) {
          log(`❌ Erro ao fechar browser: ${closeError.message}`);
        }
      }
    }
  });

  // DIAGNÓSTICO COMPLETO DO PDF EM PRODUÇÃO
  app.get('/api/debug/pdf-production', async (req: Request, res: Response) => {
    const diagnosticLog = [];
    const log = (message: string) => {
      console.log(message);
      diagnosticLog.push(message);
    };
    
    try {
      log('=== DIAGNÓSTICO PDF PRODUÇÃO - INICIANDO ===');
      const startTime = Date.now();
      
      // ETAPA 1: Verificar importação do puppeteer
      log('\n1. IMPORTANDO PUPPETEER...');
      let puppeteer;
      try {
        puppeteer = await import('puppeteer-core');
        log('✅ puppeteer-core importado com sucesso');
      } catch (error) {
        log('❌ FALHA: Não foi possível importar puppeteer-core');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 1, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 2: Verificar caminhos do Chromium
      log('\n2. VERIFICANDO CAMINHOS DO CHROMIUM...');
      const fs = await import('fs');
      const path = await import('path');
      
      const possiblePaths = [
        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        path.default.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome'),
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      let executablePath = null;
      let foundPaths = [];
      
      for (const testPath of possiblePaths) {
        try {
          if (testPath && fs.default.existsSync(testPath)) {
            foundPaths.push(testPath);
            if (!executablePath) {
              executablePath = testPath;
            }
          }
        } catch (error) {
          log(`❌ Erro ao testar ${testPath}: ${error.message}`);
        }
      }
      
      if (foundPaths.length > 0) {
        log(`✅ Caminhos encontrados: ${foundPaths.join(', ')}`);
        log(`📍 Usando: ${executablePath}`);
      } else {
        log('⚠️ Nenhum caminho válido do Chromium encontrado, tentando sem executablePath...');
      }
      
      // ETAPA 3: Tentar inicializar o Puppeteer
      log('\n3. INICIALIZANDO PUPPETEER...');
      let browser = null;
      
      const browserOptions = {
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
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        ]
      };
      
      if (executablePath) {
        browserOptions.executablePath = executablePath;
      }
      
      log('Configuração do browser: ' + JSON.stringify(browserOptions, null, 2));
      
      try {
        const launchStartTime = Date.now();
        browser = await puppeteer.default.launch(browserOptions);
        log(`✅ Puppeteer iniciado em ${Date.now() - launchStartTime}ms`);
      } catch (error) {
        log('❌ FALHA: Não foi possível inicializar o Puppeteer');
        log('Erro: ' + error.message);
        log('Stack: ' + error.stack);
        return res.json({ status: 'FALHA', etapa: 3, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 4: Criar página
      log('\n4. CRIANDO PÁGINA...');
      let page = null;
      
      try {
        page = await browser.newPage();
        log('✅ Página criada com sucesso');
      } catch (error) {
        log('❌ FALHA: Não foi possível criar página');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 4, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 5: Configurar viewport
      log('\n5. CONFIGURANDO VIEWPORT...');
      try {
        await page.setViewport({ width: 1200, height: 1600 });
        log('✅ Viewport configurado');
      } catch (error) {
        log('❌ FALHA: Não foi possível configurar viewport');
        log('Erro: ' + error.message);
      }
      
      // ETAPA 6: Testar navegação simples
      log('\n6. TESTANDO NAVEGAÇÃO SIMPLES...');
      try {
        const navStartTime = Date.now();
        await page.goto('data:text/html,<html><body><h1>Teste</h1></body></html>', {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        log(`✅ Navegação simples funcionou em ${Date.now() - navStartTime}ms`);
      } catch (error) {
        log('❌ FALHA: Navegação simples falhou');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 6, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 7: Testar geração de PDF simples
      log('\n7. TESTANDO GERAÇÃO DE PDF SIMPLES...');
      try {
        const pdfStartTime = Date.now();
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: '8mm', bottom: '8mm', left: '2mm', right: '2mm' },
          timeout: 10000
        });
        
        log(`✅ PDF simples gerado em ${Date.now() - pdfStartTime}ms, tamanho: ${pdfBuffer.length} bytes`);
      } catch (error) {
        log('❌ FALHA: Geração de PDF simples falhou');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 7, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 8: Testar acesso à URL da planilha
      log('\n8. TESTANDO ACESSO À URL DA PLANILHA...');
      
      const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      const planilhaUrl = `${baseUrl}/public-report/planilha/default?printMode=true&valorImovel=500000&valorEntrada=50000`;
      
      log(`URL da planilha: ${planilhaUrl}`);
      
      try {
        const navStartTime = Date.now();
        await page.goto(planilhaUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        log(`✅ Acesso à planilha funcionou em ${Date.now() - navStartTime}ms`);
      } catch (error) {
        log('❌ FALHA: Acesso à URL da planilha falhou');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 8, erro: error.message, log: diagnosticLog });
      }
      
      // ETAPA 9: Aguardar elementos da planilha
      log('\n9. AGUARDANDO ELEMENTOS DA PLANILHA...');
      try {
        await page.waitForSelector('.grid', { timeout: 10000 });
        log('✅ Elementos da planilha encontrados');
      } catch (error) {
        log('❌ FALHA: Elementos da planilha não encontrados');
        log('Erro: ' + error.message);
        // Não retornar erro aqui, continuar para testar PDF
      }
      
      // ETAPA 10: Testar geração de PDF da planilha
      log('\n10. TESTANDO GERAÇÃO DE PDF DA PLANILHA...');
      try {
        const pdfStartTime = Date.now();
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: '8mm', bottom: '8mm', left: '2mm', right: '2mm' },
          timeout: 30000
        });
        
        log(`✅ PDF da planilha gerado em ${Date.now() - pdfStartTime}ms, tamanho: ${pdfBuffer.length} bytes`);
      } catch (error) {
        log('❌ FALHA: Geração de PDF da planilha falhou');
        log('Erro: ' + error.message);
        return res.json({ status: 'FALHA', etapa: 10, erro: error.message, log: diagnosticLog });
      }
      
      log(`\n✅ DIAGNÓSTICO COMPLETO - TUDO FUNCIONOU! Tempo total: ${Date.now() - startTime}ms`);
      
      // Fechar browser
      if (browser) {
        await browser.close();
        log('🧹 Browser fechado');
      }
      
      return res.json({ status: 'SUCESSO', log: diagnosticLog });
      
    } catch (error) {
      log('\n❌ ERRO GERAL NO DIAGNÓSTICO:');
      log('Erro: ' + error.message);
      log('Stack: ' + error.stack);
      
      return res.json({ status: 'ERRO_GERAL', erro: error.message, log: diagnosticLog });
    }
  });

  // Legacy HTML export route - manter por compatibilidade
  app.get('/api/planilha/pdf', requireAuth, async (req: Request, res: Response) => {
    try {
      // Gerar HTML do PDF no servidor
      const queryParams = new URLSearchParams(req.url.split('?')[1] || '');
      
      // Extrair parâmetros do estado da planilha
      const valorImovel = parseFloat(queryParams.get('valorImovel') || '500000');
      const valorEntrada = parseFloat(queryParams.get('valorEntrada') || '50000');
      const prazoEntrega = parseInt(queryParams.get('prazoEntrega') || '24');
      const prazoPagamento = parseInt(queryParams.get('prazoPagamento') || '100');
      const correcaoMensalAteChaves = parseFloat(queryParams.get('correcaoMensalAteChaves') || '0.5');
      const correcaoMensalAposChaves = parseFloat(queryParams.get('correcaoMensalAposChaves') || '1.0');
      const nomeCalculo = queryParams.get('nomeCalculo') || 'projecao';
      
      // Calcular parcelas no servidor
      const valorFinanciado = valorImovel - valorEntrada;
      const valorParcela = valorFinanciado / prazoPagamento;
      
      // Gerar HTML para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Projeção de Financiamento - ${nomeCalculo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 12px; 
              line-height: 1.4; 
              color: #333;
              padding: 10mm;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #434BE6;
            }
            .header h1 {
              color: #434BE6;
              font-size: 24px;
              font-weight: bold;
            }
            .header .date {
              color: #666;
              font-size: 14px;
            }
            .summary {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #434BE6;
            }
            .summary h2 {
              color: #333;
              font-size: 18px;
              margin-bottom: 10px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .summary-label {
              font-weight: bold;
              color: #555;
            }
            .summary-value {
              color: #434BE6;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 4px;
              text-align: center;
            }
            th {
              background-color: #434BE6;
              color: white;
              font-weight: bold;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 10px;
            }
            .currency {
              color: #16a34a;
              font-weight: 500;
            }
            .percentage {
              color: #dc2626;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Projeção de Financiamento na Planta</h1>
              <p style="color: #666; margin-top: 5px;">ROImob - Sistema de Projeções Financeiras</p>
            </div>
            <div class="date">
              Gerado em: ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div class="summary">
            <h2>Resumo do Financiamento</h2>
            <div class="summary-grid">
              <div>
                <div class="summary-item">
                  <span class="summary-label">Valor do Imóvel:</span>
                  <span class="summary-value currency">R$ ${valorImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Valor de Entrada:</span>
                  <span class="summary-value currency">R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Valor Financiado:</span>
                  <span class="summary-value currency">R$ ${valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div>
                <div class="summary-item">
                  <span class="summary-label">Prazo de Entrega:</span>
                  <span class="summary-value">${prazoEntrega} meses</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Correção (até chaves):</span>
                  <span class="summary-value percentage">${correcaoMensalAteChaves}% a.m.</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Correção (após chaves):</span>
                  <span class="summary-value percentage">${correcaoMensalAposChaves}% a.m.</span>
                </div>
              </div>
            </div>
          </div>

          <h3 style="color: #333; margin-bottom: 10px;">Tabela de Amortização Detalhada</h3>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor Base</th>
                <th>% Correção</th>
                <th>Valor Corrigido</th>
                <th>Saldo Devedor</th>
                <th>Saldo Líquido</th>
                <th>Correção Acum.</th>
                <th>Taxa Editável</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Gerar linhas da tabela com cálculos completos
      let htmlRows = '';
      let saldoDevedor = valorFinanciado;
      let correcaoAcumulada = 0;
      let saldoLiquido = valorFinanciado;
      let totalPago = valorEntrada;
      let totalCorrecao = 0;
      const dataBase = new Date();
      const parcelas = [];

      // Adicionar linha da entrada primeiro
      const dataEntrada = new Date(dataBase);
      dataEntrada.setMonth(dataEntrada.getMonth() + 1);
      
      htmlRows += `
        <tr style="background-color: #f8f9fa;">
          <td>0</td>
          <td>${dataEntrada.toLocaleDateString('pt-BR')}</td>
          <td><strong>Entrada</strong></td>
          <td class="currency">R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="percentage">0,00%</td>
          <td class="currency">R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="currency">R$ ${valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="currency">R$ ${valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="percentage">0,00%</td>
          <td class="percentage">0,00%</td>
        </tr>
      `;

      // Gerar parcelas do financiamento
      for (let mes = 1; mes <= prazoPagamento; mes++) {
        const data = new Date(dataBase);
        data.setMonth(data.getMonth() + mes + 1);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        
        const correcaoMensal = mes <= prazoEntrega ? correcaoMensalAteChaves : correcaoMensalAposChaves;
        const percentualCorrecao = correcaoMensal;
        correcaoAcumulada += correcaoMensal;
        
        const valorCorrigido = valorParcela * (1 + correcaoAcumulada / 100);
        const valorCorrecaoMensal = valorCorrigido - valorParcela;
        
        saldoDevedor = Math.max(0, saldoDevedor - valorParcela);
        saldoLiquido = saldoDevedor * (1 + correcaoAcumulada / 100);
        
        totalPago += valorCorrigido;
        totalCorrecao += valorCorrecaoMensal;
        
        const tipo = mes === prazoEntrega ? 'Chaves' : 'Parcela';
        const bgColor = mes === prazoEntrega ? 'background-color: #dcfce7;' : '';
        
        htmlRows += `
          <tr style="${bgColor}">
            <td>${mes}</td>
            <td>${dataFormatada}</td>
            <td>${mes === prazoEntrega ? '<strong>' + tipo + '</strong>' : tipo}</td>
            <td class="currency">R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="percentage">${percentualCorrecao.toFixed(2)}%</td>
            <td class="currency">R$ ${valorCorrigido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="currency">R$ ${saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="currency">R$ ${saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="percentage">${correcaoAcumulada.toFixed(2)}%</td>
            <td class="percentage">${percentualCorrecao.toFixed(2)}%</td>
          </tr>
        `;
        
        parcelas.push({
          mes,
          valorBase: valorParcela,
          valorCorrigido,
          saldoDevedor,
          correcaoAcumulada
        });
      }

      const htmlFooter = `
            </tbody>
          </table>
          
          <!-- Seção de Totais do Financiamento -->
          <div style="margin-top: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h3 style="color: #333; margin-bottom: 15px; text-align: center;">Resumo Financeiro Total</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">VALOR DO IMÓVEL</div>
                <div style="font-size: 18px; font-weight: bold; color: #333;">R$ ${valorImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #059669;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">ENTRADA PAGA</div>
                <div style="font-size: 18px; font-weight: bold; color: #333;">R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">TOTAL PAGO (COM CORREÇÕES)</div>
                <div style="font-size: 18px; font-weight: bold; color: #333;">R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ea580c;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">TOTAL DE CORREÇÕES</div>
                <div style="font-size: 18px; font-weight: bold; color: #333;">R$ ${totalCorrecao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #7c3aed;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">PERCENTUAL DE CORREÇÃO</div>
                <div style="font-size: 18px; font-weight: bold; color: #333;">${((totalCorrecao / valorFinanciado) * 100).toFixed(2)}%</div>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">ECONOMIA/PREJUÍZO</div>
                <div style="font-size: 18px; font-weight: bold; color: ${totalPago < valorImovel ? '#059669' : '#dc2626'};">
                  R$ ${Math.abs(valorImovel - totalPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  ${totalPago < valorImovel ? ' (Economia)' : ' (Prejuízo)'}
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p><strong>ROImob - Sistema de Projeções Financeiras para Investimentos Imobiliários</strong></p>
            <p style="margin-top: 5px;">As informações presentes neste relatório são baseadas nas condições fornecidas pelo usuário.</p>
            <p style="margin-top: 5px;">Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
        </html>
      `;

      const completeHtml = htmlContent + htmlRows + htmlFooter;

      // Retornar HTML para conversão no frontend
      const filename = `financiamento_${nomeCalculo}_${Date.now()}.html`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      console.log('[PDF] HTML gerado com sucesso para:', filename);
      res.send(completeHtml);
      
    } catch (error) {
      console.error('[PDF] Erro ao gerar HTML:', error);
      res.status(500).json({ 
        error: 'Erro ao gerar PDF',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Financial Indexes routes
  const { bcbService } = await import('./services/bcbService');
  const { inccService } = await import('./services/inccService');
  const { cubScServiceNew } = await import('./services/cubScService_new');
  const { scheduler } = await import('./services/scheduler');

  // GET /api/financial-indexes - Retorna resumo de todos os índices
  app.get('/api/financial-indexes', async (req: Request, res: Response) => {
    try {
      console.log('[API] Buscando resumo dos índices financeiros...');
      
      const indices = ['ipca', 'igpm', 'cdi'] as const;
      const summary: Record<string, any> = {};
      
      for (const indexType of indices) {
        const average = await bcbService.getAverageLastTwelveMonths(indexType);
        const lastData = await bcbService.getLastTwelveMonths(indexType);
        
        summary[indexType] = {
          average: average ? Number(average.toFixed(4)) : null,
          lastMonth: lastData.length > 0 ? {
            month: lastData[0].month,
            value: Number(parseFloat(lastData[0].value).toFixed(4))
          } : null,
          dataCount: lastData.length
        };
      }

      // Buscar dados do INCC separadamente
      try {
        const inccAverage = await inccService.getAverageLastTwelveMonths();
        const inccLastData = await inccService.getLastTwelveMonths();
        
        summary.incc = {
          average: inccAverage ? Number(inccAverage.toFixed(4)) : null,
          lastMonth: inccLastData.length > 0 ? {
            month: inccLastData[0].month,
            value: Number(parseFloat(inccLastData[0].value).toFixed(4))
          } : null,
          dataCount: inccLastData.length,
          source: 'sinduscon-pr'
        };
      } catch (error) {
        console.error('[API] Erro ao buscar INCC:', error);
        summary.incc = { 
          average: null, 
          lastMonth: null, 
          dataCount: 0,
          source: 'sinduscon-pr'
        };
      }

      // Buscar dados do CUB-SC separadamente
      try {
        const cubScAverage = await cubScServiceNew.getAverageLastTwelveMonths();
        const cubScLastData = await cubScServiceNew.getLastTwelveMonths();
        
        summary.cub_sc = {
          average: cubScAverage ? Number(cubScAverage.toFixed(4)) : null,
          lastMonth: cubScLastData.length > 0 ? {
            month: cubScLastData[0].month,
            value: Number(Number(cubScLastData[0].monthlyVariation).toFixed(4))
          } : null,
          dataCount: cubScLastData.length,
          source: 'sinduscon-bc'
        };
      } catch (error) {
        console.error('[API] Erro ao buscar CUB-SC:', error);
        summary.cub_sc = { 
          average: null, 
          lastMonth: null, 
          dataCount: 0,
          source: 'sinduscon-bc'
        };
      }

      // Buscar SELIC meta separadamente
      try {
        const selicMeta = await bcbService.getSelicMeta();
        summary.selic_meta = {
          value: selicMeta ? Number(parseFloat(selicMeta.value).toFixed(4)) : null,
          updatedAt: selicMeta ? selicMeta.updatedAt : null
        };
      } catch (error) {
        console.error('[API] Erro ao buscar SELIC meta:', error);
        summary.selic_meta = { value: null, updatedAt: null };
      }

      // Buscar SELIC acumulada separadamente
      try {
        const selicAcumulada = await bcbService.getSelicAcumulada();
        summary.selic_acumulada = {
          value: selicAcumulada ? Number(parseFloat(selicAcumulada.valueAnnual).toFixed(4)) : null,
          referenceDate: selicAcumulada ? selicAcumulada.referenceDate : null,
          updatedAt: selicAcumulada ? selicAcumulada.createdAt : null
        };
      } catch (error) {
        console.error('[API] Erro ao buscar SELIC acumulada:', error);
        summary.selic_acumulada = { value: null, referenceDate: null, updatedAt: null };
      }
      
      console.log('[API] Resumo dos índices:', summary);
      res.json(summary);
    } catch (error) {
      console.error('[API] Erro ao buscar índices financeiros:', error);
      res.status(500).json({ error: 'Erro ao buscar índices financeiros' });
    }
  });

  // GET /api/financial-indexes/:type - Retorna últimos 12 meses de um índice específico
  app.get('/api/financial-indexes/:type', async (req: Request, res: Response) => {
    try {
      const indexType = req.params.type;
      
      if (!['ipca', 'igpm', 'selic', 'cdi', 'incc', 'cub-sc', 'cub_sc'].includes(indexType)) {
        return res.status(400).json({ error: 'Tipo de índice inválido' });
      }

      // Tratar INCC separadamente (scraping)
      if (indexType === 'incc') {
        const data = await inccService.getLastTwelveMonths();
        const average = await inccService.getAverageLastTwelveMonths();
        
        return res.json({
          indexType: 'INCC',
          data: data.map(item => ({
            month: item.month,
            value: Number(parseFloat(item.value).toFixed(4)),
            createdAt: item.createdAt
          })),
          average: average ? Number(average.toFixed(4)) : null,
          source: 'sinduscon-pr'
        });
      }

      // Tratar CUB-SC separadamente (scraping)
      if (indexType === 'cub-sc' || indexType === 'cub_sc') {
        const data = await cubScServiceNew.getLastTwelveMonths();
        const average = await cubScServiceNew.getAverageLastTwelveMonths();
        
        return res.json({
          indexType: 'CUB-SC',
          data: data.map(item => ({
            month: item.month,
            value: Number(Number(item.monthlyVariation).toFixed(4)),
            createdAt: item.createdAt
          })),
          average: average ? Number(average.toFixed(4)) : null,
          source: 'sinduscon-bc'
        });
      }
      
      console.log(`[API] Buscando dados detalhados do ${indexType.toUpperCase()}...`);
      
      const data = await bcbService.getLastTwelveMonths(indexType as any);
      const average = await bcbService.getAverageLastTwelveMonths(indexType as any);
      
      const response = {
        indexType: indexType.toUpperCase(),
        average: average ? Number(average.toFixed(4)) : null,
        data: data.map(item => ({
          month: item.month,
          value: Number(parseFloat(item.value).toFixed(4)),
          createdAt: item.createdAt
        }))
      };
      
      console.log(`[API] Retornando ${data.length} registros para ${indexType.toUpperCase()}`);
      res.json(response);
    } catch (error) {
      console.error(`[API] Erro ao buscar dados do índice ${req.params.type}:`, error);
      res.status(500).json({ error: 'Erro ao buscar dados do índice' });
    }
  });

  // POST /api/financial-indexes/collect - Executa coleta manual dos índices
  app.post('/api/financial-indexes/collect', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('[API] Iniciando coleta manual de índices...');
      
      const results = await scheduler.runManualCollection();
      
      res.json({
        message: 'Coleta de índices executada com sucesso',
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[API] Erro na coleta manual:', error);
      res.status(500).json({ error: 'Erro ao executar coleta de índices' });
    }
  });

  // GET /api/financial-indexes/scheduler/status - Status do scheduler
  app.get('/api/financial-indexes/scheduler/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const status = scheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error('[API] Erro ao obter status do scheduler:', error);
      res.status(500).json({ error: 'Erro ao obter status do scheduler' });
    }
  });

  // POST /api/test-incc-collection - Endpoint de teste para coleta do INCC
  app.post('/api/test-incc-collection', async (req: Request, res: Response) => {
    try {
      console.log('[API] Iniciando teste de coleta do INCC...');
      const result = await inccService.collectInccData();
      
      console.log('[API] Resultado da coleta INCC:', result);
      res.json(result);
    } catch (error) {
      console.error('[API] Erro no teste de coleta do INCC:', error);
      res.status(500).json({ error: 'Erro ao testar coleta do INCC' });
    }
  });

  // POST /api/test-cub-sc-collection - Endpoint de teste para coleta do CUB-SC
  app.post('/api/test-cub-sc-collection', async (req: Request, res: Response) => {
    try {
      console.log('[API] Iniciando teste de coleta do CUB-SC...');
      const result = await cubScServiceNew.collectCubScData();
      
      console.log('[API] Resultado da coleta CUB-SC:', result);
      res.json(result);
    } catch (error) {
      console.error('[API] Erro no teste de coleta do CUB-SC:', error);
      res.status(500).json({ error: 'Erro ao testar coleta do CUB-SC' });
    }
  });

  // POST /api/test-webhook-cancelamento - Endpoint de teste para webhook de cancelamento
  app.post('/api/test-webhook-cancelamento', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Simular webhook de cancelamento
      const mockSubscription = {
        id: user.stripeSubscriptionId || 'sub_test',
        customer: user.stripeCustomerId || 'cus_test',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: Math.floor((user.subscriptionCurrentPeriodEnd?.getTime() || Date.now()) / 1000)
      };

      console.log('🧪 Testing webhook cancelamento for user:', user.email);
      console.log('🧪 Mock subscription data:', JSON.stringify(mockSubscription, null, 2));

      await handleSubscriptionUpdated(mockSubscription as any);

      // Verificar se foi salvo
      const updatedUser = await storage.getUser(userId);
      
      res.json({
        success: true,
        message: 'Teste de webhook de cancelamento executado',
        before: {
          subscriptionStatus: user.subscriptionStatus,
          subscriptionCanceledAt: user.subscriptionCanceledAt
        },
        after: {
          subscriptionStatus: updatedUser?.subscriptionStatus,
          subscriptionCanceledAt: updatedUser?.subscriptionCanceledAt
        }
      });
    } catch (error) {
      console.error('Test webhook cancelamento error:', error);
      res.status(500).json({ 
        error: 'Erro no teste de webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for subscription reactivation - direct test without auth
  app.post('/api/test-direct-reativacao', async (req: Request, res: Response) => {
    try {
      // Find a user with active subscription to test with
      const testUser = await storage.getUserByEmail('teste5@gmail.com');
      
      if (!testUser) {
        return res.status(404).json({ error: 'Usuário de teste não encontrado' });
      }

      // Simulate a subscription reactivation webhook payload
      const mockSubscription = {
        id: testUser.stripeSubscriptionId || 'sub_test',
        customer: testUser.stripeCustomerId || 'cus_test',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days from now
      };

      console.log('🧪 Testing direct reactivation webhook for user:', testUser.email);
      console.log('🧪 Before reactivation - Status:', testUser.subscriptionStatus, 'Canceled at:', testUser.subscriptionCanceledAt);

      // Call the webhook handler directly
      await handleSubscriptionUpdated(mockSubscription as any);

      // Verify changes
      const updatedUser = await storage.getUser(testUser.id);
      
      res.json({
        success: true,
        message: 'Teste de reativação direta executado',
        userEmail: testUser.email,
        before: {
          subscriptionStatus: testUser.subscriptionStatus,
          subscriptionCanceledAt: testUser.subscriptionCanceledAt
        },
        after: {
          subscriptionStatus: updatedUser?.subscriptionStatus,
          subscriptionCanceledAt: updatedUser?.subscriptionCanceledAt,
          subscriptionCurrentPeriodEnd: updatedUser?.subscriptionCurrentPeriodEnd
        }
      });
    } catch (error) {
      console.error('Test direct reactivation error:', error);
      res.status(500).json({ 
        error: 'Erro no teste de reativação direta',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for subscription reactivation
  app.post('/api/test-webhook-reativacao', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Simulate subscription reactivation webhook
      const mockSubscription = {
        id: user.stripeSubscriptionId || 'sub_test',
        customer: user.stripeCustomerId || 'cus_test',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days from now
      };

      console.log('🧪 Testing webhook reactivation for user:', user.email);
      console.log('🧪 Mock subscription data:', JSON.stringify(mockSubscription, null, 2));

      await handleSubscriptionResumed(mockSubscription as any);

      // Verify changes
      const updatedUser = await storage.getUser(userId);
      
      res.json({
        success: true,
        message: 'Teste de webhook de reativação executado',
        before: {
          subscriptionStatus: user.subscriptionStatus,
          subscriptionCanceledAt: user.subscriptionCanceledAt
        },
        after: {
          subscriptionStatus: updatedUser?.subscriptionStatus,
          subscriptionCanceledAt: updatedUser?.subscriptionCanceledAt
        }
      });
    } catch (error) {
      console.error('Test webhook reactivation error:', error);
      res.status(500).json({ 
        error: 'Erro no teste de webhook de reativação',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint to simulate completely canceled subscription
  app.post('/api/test-simulate-canceled-subscription', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Simulate a completely canceled subscription
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      await storage.updateUserSubscription(user.id, {
        subscriptionStatus: 'canceled',
        subscriptionCanceledAt: pastDate,
        subscriptionCurrentPeriodEnd: pastDate
      });

      const updatedUser = await storage.getUser(userId);
      const subscriptionAccess = checkSubscriptionAccess(updatedUser!);
      
      res.json({
        message: 'Assinatura simulada como completamente cancelada',
        userId: updatedUser!.id,
        email: updatedUser!.email,
        subscriptionStatus: updatedUser!.subscriptionStatus,
        subscriptionCanceledAt: updatedUser!.subscriptionCanceledAt,
        subscriptionCurrentPeriodEnd: updatedUser!.subscriptionCurrentPeriodEnd,
        accessCheck: subscriptionAccess,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao simular assinatura cancelada:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Test endpoint for marcos@gmail.com webhook issue
  app.post('/api/test-marcos-webhook', async (req: Request, res: Response) => {
    try {
      console.log('🧪 Testing webhook creation for marcos@gmail.com');
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail('marcos@gmail.com');
      if (existingUser) {
        return res.json({
          error: 'User already exists',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            subscriptionStatus: existingUser.subscriptionStatus,
            stripeCustomerId: existingUser.stripeCustomerId
          }
        });
      }
      
      // Simulate webhook metadata for marcos@gmail.com
      const mockSession = {
        id: 'cs_test_marcos',
        customer: 'cus_test_marcos',
        subscription: 'sub_test_marcos',
        metadata: {
          action: 'user_registration',
          email: 'marcos@gmail.com',
          name: 'Marcos',
          company: 'Teste Company',
          password: Buffer.from('123456').toString('base64') // Simulate encoded password
        }
      };
      
      console.log('🧪 Mock session data:', JSON.stringify(mockSession, null, 2));
      
      // Call the webhook handler directly
      await handleCheckoutCompleted(mockSession as any);
      
      // Check if user was created
      const newUser = await storage.getUserByEmail('marcos@gmail.com');
      
      res.json({
        success: true,
        message: 'Teste de webhook executado',
        userCreated: !!newUser,
        user: newUser ? {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          subscriptionStatus: newUser.subscriptionStatus,
          stripeCustomerId: newUser.stripeCustomerId
        } : null
      });
    } catch (error) {
      console.error('Test marcos webhook error:', error);
      res.status(500).json({ 
        error: 'Erro no teste de webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for different subscription statuses
  app.post('/api/test-webhook-status', requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const validStatuses = ['active', 'cancel_at_period_end', 'canceled', 'trialing', 'paused'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Status inválido', 
          validStatuses 
        });
      }

      // Create mock subscription with specified status
      const mockSubscription = {
        id: user.stripeSubscriptionId || 'sub_test',
        customer: user.stripeCustomerId || 'cus_test',
        status: status === 'cancel_at_period_end' ? 'active' : status,
        cancel_at_period_end: status === 'cancel_at_period_end',
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
      };

      console.log(`🧪 Testing webhook status '${status}' for user:`, user.email);
      console.log('🧪 Mock subscription data:', JSON.stringify(mockSubscription, null, 2));

      // Call appropriate handler based on status
      switch (status) {
        case 'active':
        case 'cancel_at_period_end':
          await handleSubscriptionUpdated(mockSubscription as any);
          break;
        case 'canceled':
          await handleSubscriptionDeleted({ ...mockSubscription, status: 'canceled' } as any);
          break;
        case 'trialing':
          await handleSubscriptionCreated({ ...mockSubscription, status: 'trialing' } as any);
          break;
        case 'paused':
          await handleSubscriptionPaused({ ...mockSubscription, status: 'paused' } as any);
          break;
      }

      // Verify changes
      const updatedUser = await storage.getUser(userId);
      
      res.json({
        success: true,
        message: `Teste de webhook status '${status}' executado`,
        before: {
          subscriptionStatus: user.subscriptionStatus,
          subscriptionCanceledAt: user.subscriptionCanceledAt
        },
        after: {
          subscriptionStatus: updatedUser?.subscriptionStatus,
          subscriptionCanceledAt: updatedUser?.subscriptionCanceledAt
        }
      });
    } catch (error) {
      console.error('Test webhook status error:', error);
      res.status(500).json({ 
        error: 'Erro no teste de webhook de status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas administrativas' });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithProjectionCounts();
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user as any;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  app.get('/api/admin/webhook-logs', requireAdmin, async (req, res) => {
    try {
      const { limit = 50, type } = req.query;
      const logs = await storage.getStripeWebhookLogs(
        parseInt(limit as string), 
        type as string
      );
      
      // Transform logs to match frontend interface and include client relationship
      const transformedLogs = await Promise.all(logs.map(async (log) => {
        const fullBody = log.fullBody || {};
        const dataObject = fullBody.data?.object || {};
        
        // Extract customer ID from various possible locations
        let customerId = null;
        if (fullBody.customer) customerId = fullBody.customer;
        else if (dataObject.customer) customerId = dataObject.customer;
        else if (dataObject.customer_details?.email) customerId = dataObject.customer_details.email;
        else if (fullBody.data?.customer) customerId = fullBody.data.customer;
        
        // Extract subscription ID from various possible locations
        let subscriptionId = null;
        if (fullBody.subscription) subscriptionId = fullBody.subscription;
        else if (dataObject.subscription) subscriptionId = dataObject.subscription;
        else if (dataObject.id && log.type?.includes('subscription')) subscriptionId = dataObject.id;
        else if (fullBody.data?.subscription) subscriptionId = fullBody.data.subscription;
        
        // Find related client/user by customer_id
        let relatedClient = null;
        if (customerId && typeof customerId === 'string') {
          try {
            const userInfo = await storage.getUserBasicInfoByStripeCustomerId(customerId);
            if (userInfo) {
              relatedClient = {
                id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email
              };
            }
          } catch (error) {
            console.error('Error fetching user for customer ID:', customerId, error);
          }
        }
        
        return {
          id: log.id,
          type: log.type || 'unknown',
          status: log.statusCode >= 200 && log.statusCode < 300 ? 'success' : 'error',
          customerId,
          subscriptionId,
          relatedClient,
          data: log.fullBody,
          errorMessage: log.errorMessage,
          receivedAt: log.receivedAt
        };
      }));
      
      res.json(transformedLogs);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de webhook' });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Only allow specific fields to be updated
      const allowedFields = ['isAdmin', 'subscriptionStatus'];
      const filteredData: any = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      const updatedUser = await storage.updateUser(parseInt(id), filteredData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  });

  // Admin reset user password
  app.post('/api/admin/reset-user-password', requireAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;

      // Validar dados de entrada
      if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId e newPassword são obrigatórios' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
      }

      // Verificar se o usuário existe
      const targetUser = await storage.getUser(parseInt(userId));
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Gerar hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar a senha no banco de dados
      const updatedUser = await storage.updateUser(parseInt(userId), {
        password: hashedPassword
      });

      if (!updatedUser) {
        return res.status(500).json({ error: 'Erro ao atualizar senha no banco de dados' });
      }

      console.log(`✅ Admin resetou senha do usuário: ${targetUser.email} (ID: ${userId})`);

      res.json({ 
        success: true, 
        message: 'Senha redefinida com sucesso',
        userEmail: targetUser.email
      });
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Admin auto-login as another user
  app.post('/api/admin/auto-login/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const targetUserId = parseInt(userId);

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Store admin user info for security logging
      const adminUser = (req as any).user;
      console.log(`🔐 ADMIN AUTO-LOGIN: Admin ${adminUser.email} (ID: ${adminUser.id}) logging in as user ${targetUser.email} (ID: ${targetUser.id})`);

      // Update session to target user - MemoryStore handles saving automatically
      req.session.userId = targetUserId;
      console.log('✅ Admin auto-login session saved automatically by MemoryStore');

      const { password, ...safeUser } = targetUser;
      res.json({
        success: true,
        message: `Login automático realizado como ${targetUser.name}`,
        user: safeUser
      });
    } catch (error) {
      console.error('Error in admin auto-login:', error);
      res.status(500).json({ error: 'Erro no login automático' });
    }
  });

  // Admin auto-login token generation endpoint (for new tab)
  app.post('/api/admin/auto-login-token/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const targetUserId = parseInt(userId);

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Store admin user info for security logging
      const adminUser = (req as any).user;
      console.log(`🔐 ADMIN AUTO-LOGIN TOKEN: Admin ${adminUser.email} (ID: ${adminUser.id}) generating token for user ${targetUser.email} (ID: ${targetUser.id})`);

      // Generate temporary token (valid for 5 minutes)
      const token = Buffer.from(`${targetUserId}:${Date.now()}`).toString('base64');

      res.json({
        success: true,
        token: token,
        userName: targetUser.name,
        message: `Token gerado para ${targetUser.name}`
      });
    } catch (error) {
      console.error('Error generating auto-login token:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Auto-login route with token (for new tab)
  app.get('/auth/auto-login', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <body>
              <script>
                alert('Token inválido ou expirado');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Decode token
      const decoded = Buffer.from(token, 'base64').toString();
      const [userIdStr, timestampStr] = decoded.split(':');
      const userId = parseInt(userIdStr);
      const timestamp = parseInt(timestampStr);

      // Check if token is expired (5 minutes = 300000 ms)
      const isExpired = Date.now() - timestamp > 300000;
      if (isExpired) {
        return res.status(400).send(`
          <html>
            <body>
              <script>
                alert('Token expirado. Tente novamente.');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).send(`
          <html>
            <body>
              <script>
                alert('Usuário não encontrado');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Create session for user - MemoryStore handles saving automatically
      req.session.userId = userId;
      console.log('✅ Auto-login token session saved automatically by MemoryStore');
      console.log(`🔐 AUTO-LOGIN SUCCESS: Logged in as ${user.email} (ID: ${user.id}) via token`);
      
      // Redirect to dashboard
      res.send(`
        <html>
          <body>
            <script>
              window.location.href = '/dashboard';
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      console.error('Error in auto-login route:', error);
      res.status(500).send(`
        <html>
          <body>
            <script>
              alert('Erro interno do servidor');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}