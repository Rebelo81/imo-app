import { Client } from '@replit/object-storage';
import fs from 'fs-extra';
import path from 'path';

// Usar o bucket padrão conforme a documentação do Replit
const BUCKET_NAME = 'properties-images';

// Inicializar o cliente do Object Storage do Replit
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
    // Não usar prefixo para simplificar
    const objectKey = uniqueFilename;
    
    console.log(`Iniciando upload para o Object Storage, arquivo: ${objectKey}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    // Ler o arquivo como buffer
    const fileContent = await fs.readFile(filePath);
    
    // Tente criar o bucket se ele não existir (usando try/catch)
    try {
      await (client as any).createBucket(BUCKET_NAME);
      console.log(`Bucket ${BUCKET_NAME} criado ou já existe`);
    } catch (err) {
      // Ignora erro se o bucket já existir
      console.log(`Bucket já existe ou erro ao criar: ${err}`);
    }
    
    // Upload do arquivo para o Object Storage usando o método putObject
    // conforme documentação do Replit
    console.log(`Fazendo upload para ${BUCKET_NAME}/${objectKey}`);
    await (client as any).putObject({
      bucket: BUCKET_NAME,
      key: objectKey,
      body: fileContent
    });
    
    console.log(`Upload bem-sucedido para ${BUCKET_NAME}/${objectKey}`);
    
    // Usar a URL no formato especificado na documentação do Replit
    const publicUrl = `https://${BUCKET_NAME}.replit.dev/${objectKey}`;
    console.log(`URL pública gerada: ${publicUrl}`);
    
    // Remover arquivo temporário
    try {
      await fs.unlink(filePath);
      console.log('Arquivo temporário removido com sucesso');
    } catch (cleanupError) {
      console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
    }
    
    console.log(`Upload concluído com sucesso: ${publicUrl}`);
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
    // Extrair o nome do arquivo da URL
    const filename = path.basename(publicUrl);
    // No Object Storage usamos o prefixo para organizar os arquivos
    const objectKey = `${PROPERTIES_PREFIX}${filename}`;
    
    console.log(`Iniciando exclusão do arquivo ${objectKey} do Object Storage`);
    
    // Verificar se a URL é do Object Storage ou do armazenamento local
    const isLocalUrl = publicUrl.startsWith('/uploads/');
    
    if (isLocalUrl) {
      // Excluir arquivo local
      const localPath = path.join(process.cwd(), publicUrl.replace(/^\//, ''));
      if (await fs.pathExists(localPath)) {
        await fs.unlink(localPath);
        console.log(`Arquivo ${filename} excluído com sucesso do armazenamento local`);
      } else {
        console.warn(`Arquivo local não encontrado: ${localPath}`);
        return false;
      }
    } else {
      // Excluir do Object Storage
      try {
        // Verificar qual método está disponível na API
        if (typeof client.delete === 'function') {
          try {
            // Tentar usando a API com objeto de parâmetros
            await (client.delete as any)({
              bucket: BUCKET_NAME,
              key: objectKey
            });
            console.log(`Arquivo ${objectKey} excluído com sucesso do Object Storage`);
          } catch (apiErr) {
            // Tentar usando a API com parâmetros separados
            await client.delete(BUCKET_NAME, objectKey);
            console.log(`Arquivo ${objectKey} excluído com sucesso do Object Storage (parâmetros separados)`);
          }
        } else {
          // Método alternativo que deve existir em alguma versão da API
          console.log('Método delete não encontrado, tentando abordagem alternativa');
          await (client as any).deleteObject(BUCKET_NAME, objectKey);
          console.log(`Arquivo ${objectKey} excluído com sucesso do Object Storage (método alternativo)`);
        }
      } catch (deleteError) {
        console.error('Erro ao excluir do Object Storage:', deleteError);
        
        // Tentar método alternativo sem o prefixo
        try {
          if (typeof client.delete === 'function') {
            try {
              await (client.delete as any)({
                bucket: BUCKET_NAME,
                key: filename
              });
            } catch (paramErr) {
              await client.delete(BUCKET_NAME, filename);
            }
          } else {
            await (client as any).deleteObject(BUCKET_NAME, filename);
          }
          console.log(`Arquivo ${filename} excluído com sucesso do Object Storage (método alternativo)`);
        } catch (altDeleteError) {
          console.error('Erro alternativo ao excluir:', altDeleteError);
          throw altDeleteError;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    
    // Tentar excluir do armazenamento local como fallback
    try {
      const filename = path.basename(publicUrl);
      const localPath = path.join(process.cwd(), 'uploads', 'properties', filename);
      
      if (await fs.pathExists(localPath)) {
        await fs.unlink(localPath);
        console.log(`Arquivo excluído do armazenamento local como fallback: ${localPath}`);
        return true;
      }
    } catch (fallbackError) {
      console.error('Erro ao excluir do armazenamento local:', fallbackError);
    }
    
    return false;
  }
}