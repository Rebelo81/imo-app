import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Client } from '@replit/object-storage';

const router = Router();

// Only initialize Replit client in production
let client: Client | null = null;
if (process.env.NODE_ENV === 'production') {
  client = new Client();
}

// Nome do bucket padrão
const BUCKET_NAME = 'default-bucket';
const PROPERTIES_PREFIX = 'properties/';

// Função para determinar o tipo MIME com base na extensão do arquivo
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

// Rota para servir imagens do Object Storage
router.get('/uploads/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const objectKey = `${PROPERTIES_PREFIX}${filename}`;
  
  try {
    console.log(`Buscando arquivo ${objectKey} no Object Storage...`);
    
    let fileData: any = null;
    
    // Tentar obter o arquivo do Object Storage usando diferentes métodos
    try {
      // Método 1: Tentar com caminho completo (formato mais recente da API)
      try {
        const fullPath = `${BUCKET_NAME}/${objectKey}`;
        console.log(`Tentando download com caminho completo: ${fullPath}`);
        
        if (typeof client.downloadAsBytes === 'function') {
          fileData = await client.downloadAsBytes(fullPath);
          console.log('Download bem-sucedido usando downloadAsBytes com caminho completo');
        }
      } catch (pathError: any) {
        console.log('Falha no download com caminho completo:', pathError?.message || 'Erro desconhecido');
      }
      
      // Método 2: Tentar com bucket e key separados
      if (!fileData && typeof client.downloadFromBytes === 'function') {
        try {
          console.log(`Tentando download com método downloadFromBytes: ${BUCKET_NAME}, ${objectKey}`);
          fileData = await (client as any).downloadFromBytes(BUCKET_NAME, objectKey);
          console.log('Download bem-sucedido usando downloadFromBytes');
        } catch (separateError: any) {
          console.log('Falha no método downloadFromBytes:', separateError?.message || 'Erro desconhecido');
        }
      }
      
      // Método 3: Usar método download()
      if (!fileData) {
        try {
          console.log(`Tentando método native download: ${BUCKET_NAME}/${objectKey}`);
          
          // Usar readFile do API do cliente
          fileData = await (client as any).download({
            bucket: BUCKET_NAME,
            key: objectKey
          });
          console.log('Download bem-sucedido usando download()');
        } catch (downloadError: any) {
          console.log('Falha no método download():', downloadError?.message || 'Erro desconhecido');
        }
      }
      
      // Se conseguimos obter o arquivo, enviá-lo como resposta
      if (fileData) {
        // Definir cabeçalhos para cache e tipo de conteúdo
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano
        res.set('Content-Type', getMimeType(filename));
        
        // Enviar os dados como Buffer
        if (Buffer.isBuffer(fileData)) {
          res.send(fileData);
        } else if (fileData.buffer) {
          res.send(fileData.buffer);
        } else if (typeof fileData === 'string') {
          res.send(Buffer.from(fileData));
        } else {
          // Tentar converter para Buffer de qualquer forma
          res.send(Buffer.from(String(fileData)));
        }
        return;
      } else {
        console.log('Nenhum método de download do Object Storage funcionou');
      }
    } catch (objectStorageError: any) {
      console.error(`Erro geral ao acessar o Object Storage:`, objectStorageError?.message || 'Erro desconhecido');
      // Continuar para o fallback local
    }
    
    // Fallback: verificar no sistema de arquivos local
    console.log('Tentando fallback para sistema de arquivos local...');
    const localPath = path.join(process.cwd(), 'uploads', 'properties', filename);
    
    if (await fs.pathExists(localPath)) {
      console.log(`Arquivo encontrado no sistema de arquivos local: ${localPath}`);
      return res.sendFile(localPath);
    }
    
    // Se chegou aqui, o arquivo não foi encontrado em nenhum local
    console.warn(`Arquivo não encontrado: ${filename}`);
    return res.status(404).send('Arquivo não encontrado');
    
  } catch (error: any) {
    console.error(`Erro ao servir o arquivo ${filename}:`, error?.message || 'Erro desconhecido');
    return res.status(500).send('Erro interno ao processar o arquivo');
  }
});

export default router;