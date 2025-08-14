import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middlewares/upload';
import { uploadImage, deleteImage } from '../services/image-manager';
import { storage } from '../storage';
import multer from 'multer';

const router = Router();

// Middleware para tratar erros do multer
const handleMulterErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'A imagem deve ter no máximo 5MB' });
    }
  } else if (err && err.message) {
    if (err.message.includes('PNG ou JPEG')) {
      return res.status(400).json({ error: 'A imagem deve ser PNG ou JPEG' });
    }
  }
  
  // Para outros erros não capturados acima
  return res.status(400).json({ error: err.message || 'Erro no upload do arquivo' });
};

// Rota para upload de imagens de propriedades
router.post('/properties', (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    console.log('Processando upload de imagem:', req.file);
    
    // Fazer upload da imagem
    const imageUrl = await uploadImage(req.file.path, req.file.originalname);
    
    // Retornar os dados do arquivo com a URL pública
    return res.status(201).json({
      message: 'Arquivo enviado com sucesso',
      file: {
        filename: imageUrl.split('/').pop(),
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    return res.status(500).json({ error: 'Erro ao processar upload de imagem' });
  }
});

// Middleware de autenticação
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  (req as any).userId = userId;
  next();
};

// Rota para upload de logo de empresa (SEM autenticação - para registro)
router.post('/company-logo', (req: Request, res: Response, next: NextFunction) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    console.log('Processando upload de logo da empresa:', req.file);
    
    // Fazer upload do logo
    const logoUrl = await uploadImage(req.file.path, `logo-${Date.now()}-${req.file.originalname}`);
    
    console.log('Logo salvo no storage:', logoUrl);
    
    // Retornar os dados do arquivo com a URL pública (SEM atualizar banco)
    return res.status(201).json({
      message: 'Logo enviado com sucesso',
      file: {
        filename: logoUrl.split('/').pop(),
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: logoUrl
      }
    });
  } catch (error) {
    console.error('Erro no upload de logo:', error);
    return res.status(500).json({ error: 'Erro ao processar upload de logo' });
  }
});

// Rota para upload de logo de empresa COM autenticação (para usuários logados)
router.post('/user-logo', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    console.log('Processando upload de logo do usuário logado:', req.file);
    
    // Fazer upload do logo
    const logoUrl = await uploadImage(req.file.path, `logo-${Date.now()}-${req.file.originalname}`);
    
    console.log('Logo salvo no storage:', logoUrl);
    
    // Atualizar usuário com a nova URL do logo no banco de dados
    const updatedUser = await storage.updateUser(userId, { photo: logoUrl });
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('Usuário atualizado no banco de dados com logo:', updatedUser.photo);
    
    // Retornar os dados do arquivo com a URL pública
    return res.status(201).json({
      message: 'Logo enviado com sucesso',
      file: {
        filename: logoUrl.split('/').pop(),
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: logoUrl
      },
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        photo: updatedUser.photo
      }
    });
  } catch (error) {
    console.error('Erro no upload de logo:', error);
    return res.status(500).json({ error: 'Erro ao processar upload de logo' });
  }
});

// Rota para remover uma imagem
router.delete('/properties/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Construir URL completa (não precisamos da URL exata, apenas do nome do arquivo)
    // O deleteImage vai tentar localizar o arquivo em ambos os armazenamentos
    const fileUrl = filename;
    
    // Remover o arquivo
    const result = await deleteImage(fileUrl);
    
    if (result) {
      return res.status(200).json({ message: 'Arquivo removido com sucesso' });
    } else {
      return res.status(400).json({ error: 'Não foi possível remover o arquivo' });
    }
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return res.status(500).json({ error: 'Erro ao processar remoção de imagem' });
  }
});

export default router;