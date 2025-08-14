import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Diretório para uploads de propriedades
const PROPERTIES_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'properties');

// Rota para servir arquivos do sistema de arquivos local
router.get('/serve/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Verificar se o nome do arquivo está vazio ou contém caminhos inválidos
    if (!filename || filename.includes('..')) {
      return res.status(400).send('Nome de arquivo inválido');
    }
    
    // Criar caminho completo para o arquivo
    const filePath = path.join(PROPERTIES_UPLOADS_DIR, filename);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.log(`Arquivo não encontrado: ${filePath}`);
      return res.status(404).send('Arquivo não encontrado');
    }
    
    // Detectar o tipo MIME baseado na extensão do arquivo
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: {[key: string]: string} = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };
    
    // Definir o tipo de conteúdo correto
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Enviar o arquivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    res.status(500).send('Erro ao processar a solicitação');
  }
});

export default router;