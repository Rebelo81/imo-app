import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

// Inicializar o cliente do Object Storage
const client = new Client();

// Diretório de fallback para armazenamento local de arquivos
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'properties');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Faz upload de um arquivo para o Object Storage do Replit ou armazenamento local
 * @param filePath Caminho do arquivo temporário
 * @param originalFilename Nome original do arquivo
 * @returns URL pública do arquivo
 */
export async function uploadImage(filePath: string, originalFilename: string): Promise<string> {
  // Gerar um nome único para o arquivo
  const fileExtension = path.extname(originalFilename);
  const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;

  try {
    // Primeiro, tentar salvar no sistema de arquivos local como fallback seguro
    const destinationPath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.copyFileSync(filePath, destinationPath);
    
    // Ler o conteúdo do arquivo
    const fileContent = fs.readFileSync(filePath);
    
    // Tentar fazer upload para o Object Storage do Replit
    const objectPath = `default-bucket/${uniqueFilename}`;
    console.log(`Tentando upload para Object Storage: ${objectPath}`);
    
    try {
      // Usar o método correto de acordo com a documentação atual do Replit
      await client.upload(objectPath, fileContent);
      console.log(`Upload bem-sucedido para Object Storage: ${objectPath}`);
      
      // Retornar URL do Object Storage
      const publicUrl = `https://default-bucket.replit.dev/${uniqueFilename}`;
      console.log(`URL do Object Storage: ${publicUrl}`);
      return publicUrl;
    } catch (objectStorageError) {
      console.error('Erro ao fazer upload para Object Storage:', objectStorageError);
      
      // Usar URL local como fallback se falhar o upload para Object Storage
      let hostname = '';
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        hostname = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        hostname = 'localhost:5000';
      }
      
      const protocol = hostname.includes('localhost') ? 'http' : 'https';
      const localUrl = `${protocol}://${hostname}/api/uploads/serve/${uniqueFilename}`;
      console.log(`Usando URL local como fallback: ${localUrl}`);
      return localUrl;
    } finally {
      // Limpar o arquivo temporário original
      try {
        fs.unlinkSync(filePath);
        console.log('Arquivo temporário removido com sucesso');
      } catch (cleanupError) {
        console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
      }
    }
  } catch (error) {
    console.error('Erro ao processar upload de imagem:', error);
    throw new Error('Falha ao fazer upload da imagem');
  }
}

/**
 * Remove um arquivo do Object Storage e armazenamento local
 * @param fileId Nome do arquivo ou URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteImage(fileId: string): Promise<boolean> {
  try {
    // Extrair o nome do arquivo da URL ou usar o próprio fileId se já for o nome do arquivo
    const filename = fileId.includes('/') ? fileId.split('/').pop() : fileId;
    
    if (!filename) {
      console.warn(`Nome de arquivo inválido: ${fileId}`);
      return false;
    }
    
    let successObjectStorage = false;
    let successLocalStorage = false;
    
    // Tentar excluir do Object Storage
    try {
      const objectPath = `default-bucket/${filename}`;
      console.log(`Tentando excluir do Object Storage: ${objectPath}`);
      await client.remove(objectPath);
      console.log(`Arquivo excluído do Object Storage: ${objectPath}`);
      successObjectStorage = true;
    } catch (objectStorageError) {
      console.error('Erro ao excluir do Object Storage:', objectStorageError);
    }
    
    // Também excluir do armazenamento local
    try {
      const localPath = path.join(UPLOADS_DIR, filename);
      console.log(`Verificando se arquivo existe no armazenamento local: ${localPath}`);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`Arquivo excluído do armazenamento local: ${localPath}`);
        successLocalStorage = true;
      } else {
        console.log(`Arquivo não encontrado no armazenamento local: ${localPath}`);
      }
    } catch (localStorageError) {
      console.error('Erro ao excluir do armazenamento local:', localStorageError);
    }
    
    // Retornar sucesso se pelo menos um dos métodos funcionou
    return successObjectStorage || successLocalStorage;
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return false;
  }
}