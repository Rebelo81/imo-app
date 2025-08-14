import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Client } from '@replit/object-storage';
import os from 'os';

const router = Router();

// Configuração do Object Storage
const BUCKET_NAME = 'uploads';
const PROPERTIES_PREFIX = 'properties/';

// Cliente do Object Storage (apenas em produção)
const client = process.env.NODE_ENV === 'production' ? new Client() : null;

// Diretório para uploads de propriedades
const PROPERTIES_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'properties');

// Garantir que o diretório existe
if (!fs.existsSync(PROPERTIES_UPLOADS_DIR)) {
  fs.mkdirSync(PROPERTIES_UPLOADS_DIR, { recursive: true });
}

// Mostrar debug das imagens disponíveis no diretório
console.log('Arquivos disponíveis em uploads/properties:');
if (fs.existsSync(PROPERTIES_UPLOADS_DIR)) {
  const files = fs.readdirSync(PROPERTIES_UPLOADS_DIR);
  console.log(files);
}

// Função para obter o tipo MIME baseado na extensão do arquivo
function getMimeType(filename: string): string {
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
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Rota para servir arquivos do sistema de arquivos local ou Object Storage
router.get('/serve/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Verificar se o nome do arquivo está vazio ou contém caminhos inválidos
    if (!filename || filename.includes('..')) {
      return res.status(400).send('Nome de arquivo inválido');
    }
    
    // Verificar primeiro no sistema de arquivos local
    const localFilePath = path.join(PROPERTIES_UPLOADS_DIR, filename);
    
    if (fs.existsSync(localFilePath)) {
      console.log(`Arquivo encontrado no sistema local: ${localFilePath}`);
      
      // Definir o tipo de conteúdo correto
      const contentType = getMimeType(filename);
      res.setHeader('Content-Type', contentType);
      
      // Enviar o arquivo do sistema local
      const fileStream = fs.createReadStream(localFilePath);
      return fileStream.pipe(res);
    }
    
    // Se não encontrou no sistema local, tentar no Object Storage
    console.log(`Tentando buscar arquivo do Object Storage: ${PROPERTIES_PREFIX}${filename}`);
    
    // Tentar baixar o arquivo do Object Storage (apenas em produção)
    if (client) {
      const objectKey = `${PROPERTIES_PREFIX}${filename}`;
      
      // Baixar o arquivo para um arquivo temporário
      const tempFile = path.join(os.tmpdir(), `temp-${filename}`);
      
      try {
        await client.downloadToFilename(objectKey, tempFile);
      
      if (fs.existsSync(tempFile)) {
        console.log(`Arquivo encontrado no Object Storage e baixado para: ${tempFile}`);
        
        // Copiar para a pasta de uploads como cópia local permanente
        const localFilePath = path.join(PROPERTIES_UPLOADS_DIR, filename);
        fs.copyFileSync(tempFile, localFilePath);
        console.log(`Cópia local permanente salva em: ${localFilePath}`);
        
        // Ler o arquivo e enviá-lo como resposta
        const fileData = fs.readFileSync(tempFile);
        
        // Definir o tipo de conteúdo correto
        const contentType = getMimeType(filename);
        res.setHeader('Content-Type', contentType);
        
        // Enviar o arquivo como resposta
        return res.send(fileData);
      } else {
        console.log(`Arquivo não encontrado no Object Storage após download: ${objectKey}`);
      }
    } catch (objectStorageError) {
      console.error('Erro ao baixar arquivo do Object Storage:', objectStorageError);
    }
  } else {
    console.log('Modo desenvolvimento: Object Storage não disponível, usando apenas armazenamento local');
  }
  
  // Fallback: arquivo não encontrado
  return res.status(404).send('Arquivo não encontrado');
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    res.status(500).send('Erro ao processar a solicitação');
  }
});

export default router;