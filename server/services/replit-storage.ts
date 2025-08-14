import { Client } from '@replit/object-storage';
import fs from 'fs-extra';
import path from 'path';

// Nome do bucket para armazenar as imagens - usando o bucket default conforme documentação
const BUCKET_NAME = 'default-bucket';

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
    
    console.log(`Iniciando upload para o Object Storage, arquivo: ${uniqueFilename}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    // Ler o arquivo como buffer
    const fileContent = await fs.readFile(filePath);

    // Upload do arquivo para o Object Storage usando o método nativo
    // exatamente como mostrado na documentação oficial
    console.log(`Fazendo upload para ${BUCKET_NAME}/${uniqueFilename}`);
    await client.put(`${BUCKET_NAME}/${uniqueFilename}`, fileContent);
    
    console.log(`Upload bem-sucedido para ${BUCKET_NAME}/${uniqueFilename}`);
    
    // Gerar URL pública (formato padrão do Replit Object Storage)
    const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
    console.log(`URL pública gerada: ${publicUrl}`);
    
    // Remover arquivo temporário
    try {
      await fs.unlink(filePath);
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
      await fs.ensureDir(uploadsDir);
      const destinationPath = path.join(uploadsDir, uniqueFilename);
      
      // Mover arquivo para o destino
      await fs.copy(filePath, destinationPath);
      console.log(`Arquivo copiado para armazenamento local: ${destinationPath}`);
      
      // Gerar URL local
      let hostname = '';
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        hostname = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        hostname = 'localhost:5000';
      }
      const protocol = hostname.includes('localhost') ? 'http' : 'https';
      const localUrl = `${protocol}://${hostname}/api/uploads/${uniqueFilename}`;
      
      // Limpar arquivo temporário
      try {
        await fs.unlink(filePath);
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
    // Extrair o nome do bucket e a chave da URL pública
    const urlPattern = new RegExp(`https://(.+)\\.replit\\.dev/(.+)`);
    const matches = publicUrl.match(urlPattern);
    
    if (!matches || matches.length < 3) {
      console.warn(`URL inválida para exclusão: ${publicUrl}`);
      return false;
    }
    
    const bucket = matches[1];
    const key = matches[2];
    
    console.log(`Excluindo arquivo ${key} do bucket ${bucket}`);
    
    // Excluir o objeto do Object Storage usando método nativo
    await client.delete(`${bucket}/${key}`);
    
    console.log(`Arquivo ${key} excluído com sucesso do bucket ${bucket}`);
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo do Object Storage:', error);
    return false;
  }
}