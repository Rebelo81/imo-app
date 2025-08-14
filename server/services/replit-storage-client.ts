import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

// Inicializar o cliente do Object Storage (apenas em produção)
const client = process.env.NODE_ENV === 'production' ? new Client() : null;

// Nome fixo do bucket para armazenamento de arquivos
const BUCKET_NAME = 'default-bucket';

// Prefixo para arquivos de propriedades
const PROPERTIES_PREFIX = 'properties/';

// Diretório local para fallback
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'properties');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Faz upload de um arquivo para o Object Storage do Replit
 * @param filePath Caminho do arquivo temporário
 * @param originalFilename Nome original do arquivo
 * @returns URL pública do arquivo no Object Storage ou undefined em caso de falha
 */
export async function uploadToObjectStorage(filePath: string, originalFilename: string): Promise<string | undefined> {
  try {
    // Gerar um nome único para o arquivo que será usado tanto no Object Storage quanto na URL local
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
    const objectPath = `${PROPERTIES_PREFIX}${uniqueFilename}`;
    
    // Em desenvolvimento, usar apenas armazenamento local
    if (!client) {
      console.log(`Modo desenvolvimento: copiando arquivo para armazenamento local: ${uniqueFilename}`);
      const localFilePath = path.join(UPLOADS_DIR, uniqueFilename);
      fs.copyFileSync(filePath, localFilePath);
      const localUrl = `/api/uploads/serve/${uniqueFilename}`;
      console.log(`URL local gerada: ${localUrl}`);
      return localUrl;
    }
    
    console.log(`Tentando fazer upload para Object Storage: ${objectPath}`);
    
    // Usar o método uploadFromFilename que está disponível na API
    await client.uploadFromFilename(objectPath, filePath);
    
    console.log(`Upload bem-sucedido para Object Storage: ${objectPath}`);
    
    // Retornar URL acessível publicamente usando nossa rota local
    const localUrl = `/api/uploads/serve/${uniqueFilename}`;
    
    console.log(`URL pública gerada: ${localUrl}`);
    return localUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para Object Storage:', error);
    return undefined;
  }
}

/**
 * Remove um arquivo do Object Storage do Replit
 * @param publicUrl URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteFromObjectStorage(publicUrl: string): Promise<boolean> {
  try {
    // Em desenvolvimento, tentar excluir do armazenamento local
    if (!client) {
      const filename = publicUrl.split('/').pop();
      if (filename) {
        const localFilePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
          console.log(`Arquivo local excluído: ${filename}`);
          return true;
        }
      }
      console.log(`Arquivo local não encontrado para exclusão`);
      return false;
    }
    
    // Extrair o caminho do objeto da URL pública
    const urlObj = new URL(publicUrl);
    const objectPath = urlObj.pathname.startsWith('/') 
      ? urlObj.pathname.substring(1) // Remover barra inicial
      : urlObj.pathname;
    
    console.log(`Tentando excluir objeto do Object Storage: ${objectPath}`);
    
    // Verificar se o objeto existe antes de tentar excluir
    const exists = await client.exists(objectPath);
    
    if (exists) {
      // Usar o método delete que está disponível na API
      await client.delete(objectPath);
      console.log(`Objeto excluído com sucesso: ${objectPath}`);
      return true;
    } else {
      console.log(`Objeto não encontrado para exclusão: ${objectPath}`);
      return false;
    }
  } catch (error) {
    console.error('Erro ao processar URL para exclusão:', error);
    return false;
  }
}