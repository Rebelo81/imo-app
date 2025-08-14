import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

// Nome do bucket para armazenamento de imagens de propriedades
const BUCKET_NAME = 'properties-images';

// Inicializar o cliente do Object Storage do Replit
const storageClient = new Client();

/**
 * Faz upload de um arquivo para o Object Storage
 * @param filePath Caminho do arquivo temporário
 * @param originalFilename Nome original do arquivo
 * @returns URL pública do arquivo no Object Storage
 */
export async function uploadToObjectStorage(filePath: string, originalFilename: string): Promise<string> {
  try {
    // Criar um nome de arquivo único
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
    
    // Ler o arquivo do disco
    const fileContent = fs.readFileSync(filePath);
    
    // Upload para o Object Storage
    console.log(`Iniciando upload para o bucket ${BUCKET_NAME}, arquivo: ${uniqueFilename}`);
    
    try {
      // Tentar chamar a API putObject do SDK
      const result = await storageClient.putObject({
        bucketName: BUCKET_NAME,
        key: uniqueFilename,
        body: fileContent
      });
      
      // Verificar resultado da operação
      if (!result.ok) {
        throw new Error(`Falha no upload: ${result.error}`);
      }
      
      // Criar URL pública para o objeto
      const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
      
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
      }
      
      console.log(`Upload concluído com sucesso: ${publicUrl}`);
      return publicUrl;
    } catch (uploadError: any) {
      // Verificar se o erro é devido ao método não encontrado
      if (uploadError.message && uploadError.message.includes('is not a function')) {
        // Tentar método alternativo conforme a versão do SDK
        console.log('Tentando método alternativo para upload...');
        
        // @ts-ignore - Ignorar verificação de tipo para tentar métodos alternativos
        const altResult = await storageClient.put(BUCKET_NAME, uniqueFilename, fileContent);
        
        // Verificar resultado
        if (!altResult.ok) {
          throw new Error(`Falha no upload alternativo: ${altResult.error}`);
        }
        
        // Criar URL pública
        const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
        
        // Limpar arquivo temporário
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
        }
        
        console.log(`Upload alternativo concluído com sucesso: ${publicUrl}`);
        return publicUrl;
      } else {
        // Se não for um erro de método, relançar o erro original
        throw uploadError;
      }
    }
  } catch (error) {
    console.error('Erro ao fazer upload para o Object Storage:', error);
    
    // Em caso de erro, retornar um caminho local como fallback
    const uploadsDir = path.join(process.cwd(), 'uploads', 'properties');
    
    // Garantir que o diretório de uploads existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Mover o arquivo para o diretório de uploads (fallback local)
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.floor(Math.random() * 1000000)}${fileExtension}`;
    const destinationPath = path.join(uploadsDir, uniqueFilename);
    
    // Copiar o arquivo para o destino local
    fs.copyFileSync(filePath, destinationPath);
    
    // Limpar o arquivo temporário
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Aviso: Não foi possível remover o arquivo temporário', cleanupError);
    }
    
    // Retornar caminho local como URL
    return `/uploads/properties/${uniqueFilename}`;
  }
}

/**
 * Remove um arquivo do Object Storage
 * @param publicUrl URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteFromObjectStorage(publicUrl: string): Promise<boolean> {
  try {
    // Extrair o nome do arquivo da URL
    const filename = path.basename(publicUrl);
    
    console.log(`Iniciando exclusão do arquivo ${filename} do bucket ${BUCKET_NAME}`);
    
    try {
      // Tentar chamar a API deleteObject do SDK
      const result = await storageClient.deleteObject({
        bucketName: BUCKET_NAME,
        key: filename
      });
      
      // Verificar resultado
      if (!result.ok) {
        throw new Error(`Falha na exclusão: ${result.error}`);
      }
      
      console.log(`Arquivo ${filename} excluído com sucesso do Object Storage`);
      return true;
    } catch (deleteError: any) {
      // Verificar se o erro é devido ao método não encontrado
      if (deleteError.message && deleteError.message.includes('is not a function')) {
        // Tentar método alternativo conforme a versão do SDK
        console.log('Tentando método alternativo para exclusão...');
        
        // @ts-ignore - Ignorar verificação de tipo para tentar métodos alternativos
        const altResult = await storageClient.delete(BUCKET_NAME, filename);
        
        // Verificar resultado
        if (!altResult.ok) {
          throw new Error(`Falha na exclusão alternativa: ${altResult.error}`);
        }
        
        console.log(`Arquivo ${filename} excluído com sucesso do Object Storage (método alternativo)`);
        return true;
      } else {
        // Se não for um erro de método, relançar o erro original
        throw deleteError;
      }
    }
  } catch (error) {
    console.error('Erro ao excluir arquivo do Object Storage:', error);
    
    // Em caso de erro no Object Storage, verificar se o arquivo existe localmente como fallback
    const localPath = path.join(process.cwd(), 'uploads', 'properties', path.basename(publicUrl));
    
    // Verificar se existe localmente e excluir
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log(`Arquivo excluído do armazenamento local: ${localPath}`);
        return true;
      } catch (localError) {
        console.error('Erro ao excluir arquivo local:', localError);
        return false;
      }
    }
    
    return false;
  }
}