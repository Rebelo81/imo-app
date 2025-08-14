import fs from 'fs';
import path from 'path';
import { uploadToObjectStorage, deleteFromObjectStorage } from './replit-storage-client';

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
    
    // Tentar fazer upload para o Object Storage do Replit
    console.log(`Tentando upload para Object Storage...`);
    
    try {
      // Tenta usar o Object Storage
      const objectStorageUrl = await uploadToObjectStorage(filePath, originalFilename);
      
      if (objectStorageUrl) {
        console.log(`Upload bem-sucedido para Object Storage: ${objectStorageUrl}`);
        return objectStorageUrl;
      } else {
        throw new Error('Falha no upload para Object Storage');
      }
    } catch (objectStorageError) {
      console.error('Erro ao fazer upload para Object Storage:', objectStorageError);
      
      // Fallback: retornar URL do armazenamento local
      console.log('Usando fallback para armazenamento local');
      const localUrl = `/api/uploads/serve/${uniqueFilename}`;
      return localUrl;
    }
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error);
    
    // Em último caso, retornar URL do armazenamento local
    const localUrl = `/api/uploads/serve/${uniqueFilename}`;
    return localUrl;
  }
}

/**
 * Remove um arquivo do Object Storage e armazenamento local
 * @param fileId Nome do arquivo ou URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteImage(fileId: string): Promise<boolean> {
  try {
    let filename = fileId;
    
    // Se for uma URL completa (Object Storage ou local), extrair o nome do arquivo
    if (fileId.startsWith('http') || fileId.startsWith('/api')) {
      const urlParts = fileId.split('/');
      filename = urlParts[urlParts.length - 1];
    }
    
    let success = false;
    
    // Tentar excluir do Object Storage se for uma URL do Object Storage
    if (fileId.includes('replit.dev')) {
      try {
        success = await deleteFromObjectStorage(fileId);
        console.log(`Exclusão do Object Storage: ${success ? 'Sucesso' : 'Falha'}`);
      } catch (objectStorageError) {
        console.error('Erro ao excluir do Object Storage:', objectStorageError);
      }
    }
    
    // Tentar excluir do sistema de arquivos local (como backup ou fallback)
    const localFilePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log(`Arquivo local excluído: ${localFilePath}`);
      success = true;
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return false;
  }
}