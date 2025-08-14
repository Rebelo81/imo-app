import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

// Inicializar o cliente do Object Storage
const client = new Client();

// Nome fixo do bucket
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
    // Gerar um nome único para o arquivo
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `${PROPERTIES_PREFIX}property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
    
    // Ler o conteúdo do arquivo
    const fileContent = fs.readFileSync(filePath);
    
    // Caminho completo do objeto no Object Storage
    const objectPath = `${uniqueFilename}`;
    
    console.log(`Tentando fazer upload para Object Storage: ${objectPath}`);
    
    // Usar o método put para fazer upload do arquivo
    await client.put(objectPath, fileContent);
    
    console.log(`Upload bem-sucedido para Object Storage: ${objectPath}`);
    
    // Retornar URL pública
    // A URL pública segue o formato: https://<bucket-name>.replit.dev/<object-path>
    const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
    
    return publicUrl;
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
    // Extrair o caminho do objeto da URL pública
    const urlObj = new URL(publicUrl);
    const objectPath = urlObj.pathname.startsWith('/') 
      ? urlObj.pathname.substring(1) // Remover barra inicial
      : urlObj.pathname;
    
    console.log(`Tentando excluir objeto do Object Storage: ${objectPath}`);
    
    // Verificar se o objeto existe antes de tentar excluir
    try {
      // O método delete não retorna erro se o objeto não existir
      await client.delete(objectPath);
      console.log(`Objeto excluído com sucesso: ${objectPath}`);
      return true;
    } catch (deleteError) {
      console.error(`Erro ao excluir objeto ${objectPath}:`, deleteError);
      return false;
    }
  } catch (error) {
    console.error('Erro ao processar URL para exclusão:', error);
    return false;
  }
}