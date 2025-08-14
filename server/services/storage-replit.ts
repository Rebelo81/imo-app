import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

// Inicializar o cliente do Object Storage
const client = new Client();

/**
 * Faz upload de um arquivo para o Object Storage do Replit
 * @param filePath Caminho do arquivo temporário
 * @param originalFilename Nome original do arquivo
 * @returns URL pública do arquivo no Object Storage
 */
export async function uploadToObjectStorage(filePath: string, originalFilename: string): Promise<string> {
  try {
    // Gerar um nome único para o arquivo
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
    
    // Definir o caminho completo do objeto: bucket/key
    const objectPath = `default-bucket/${uniqueFilename}`;
    
    console.log(`Iniciando upload para o Object Storage: ${objectPath}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    // Ler o arquivo como buffer
    const fileContent = fs.readFileSync(filePath);
    
    // Upload do arquivo para o Object Storage usando o método put
    // Exemplo da documentação oficial do Replit
    await client.put(objectPath, fileContent);
    
    console.log(`Upload bem-sucedido para: ${objectPath}`);
    
    // Gerar URL pública (formato padrão do Replit Object Storage)
    const publicUrl = `https://default-bucket.replit.dev/${uniqueFilename}`;
    console.log(`URL pública gerada: ${publicUrl}`);
    
    // Remover arquivo temporário
    try {
      fs.unlinkSync(filePath);
      console.log('Arquivo temporário removido com sucesso');
    } catch (cleanupError) {
      console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
    }
    
    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para o Object Storage:', error);
    
    // Em caso de erro, usar armazenamento local como fallback
    try {
      console.log('Usando armazenamento local como fallback...');
      
      // Gerar nome único
      const fileExtension = path.extname(originalFilename);
      const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
      const uploadsDir = path.join(process.cwd(), 'uploads', 'properties');
      
      // Garantir que o diretório de uploads existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const destinationPath = path.join(uploadsDir, uniqueFilename);
      
      // Copiar arquivo para o destino
      fs.copyFileSync(filePath, destinationPath);
      console.log(`Arquivo copiado para armazenamento local: ${destinationPath}`);
      
      // Gerar URL local
      let hostname = '';
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        hostname = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        hostname = 'localhost:5000';
      }
      const protocol = hostname.includes('localhost') ? 'http' : 'https';
      const localUrl = `${protocol}://${hostname}/api/uploads/serve/${uniqueFilename}`;
      
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
      }
      
      return localUrl;
    } catch (fallbackError) {
      console.error('Erro ao usar armazenamento local como fallback:', fallbackError);
      throw error;
    }
  }
}

/**
 * Remove um arquivo do Object Storage do Replit
 * @param publicUrl URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteFromObjectStorage(publicUrl: string): Promise<boolean> {
  try {
    // Extrair o nome do arquivo da URL
    const filename = publicUrl.split('/').pop();
    
    if (!filename) {
      console.warn(`Nome de arquivo não pôde ser extraído da URL: ${publicUrl}`);
      return false;
    }
    
    // Definir caminho completo do objeto no bucket
    const objectPath = `default-bucket/${filename}`;
    
    console.log(`Excluindo arquivo: ${objectPath}`);
    
    // Excluir o objeto do Object Storage
    await client.delete(objectPath);
    
    console.log(`Arquivo excluído com sucesso: ${objectPath}`);
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo do Object Storage:', error);
    return false;
  }
}