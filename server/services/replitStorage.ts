import { Client } from '@replit/object-storage';
import path from 'path';
import fs from 'fs';

// Nome do bucket para armazenar as imagens de propriedades
const BUCKET_NAME = 'properties-images';

// Inicializar o cliente do Object Storage
const client = new Client();

/**
 * Faz upload de um arquivo para o Object Storage do Replit
 * @param filePath Caminho local temporário do arquivo
 * @param originalFilename Nome original do arquivo
 * @returns URL pública do arquivo no Object Storage
 */
export async function uploadToReplitStorage(filePath: string, originalFilename: string): Promise<string> {
  try {
    // Gerar um nome único para o arquivo
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.round(Math.random() * 1000000000)}${fileExtension}`;
    
    // Ler o conteúdo do arquivo
    const fileContent = fs.readFileSync(filePath);
    
    // Fazer upload para o Object Storage usando métodos corretos da API
    const result = await client.putObject({
      bucketName: BUCKET_NAME,
      key: uniqueFilename,
      body: fileContent
    });
    
    if (!result.ok) {
      throw new Error(`Falha ao fazer upload: ${result.error}`);
    }
    
    // Gerar URL pública para o arquivo
    const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
    
    // Remover o arquivo temporário
    fs.unlinkSync(filePath);
    
    console.log(`Imagem enviada com sucesso para o Object Storage: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para o Object Storage:', error);
    throw error;
  }
}

/**
 * Exclui um arquivo do Object Storage do Replit
 * @param publicUrl URL pública do arquivo
 * @returns Verdadeiro se a exclusão foi bem-sucedida
 */
export async function deleteFromReplitStorage(publicUrl: string): Promise<boolean> {
  try {
    // Extrair o nome do arquivo da URL
    const objectKey = path.basename(publicUrl);
    
    // Excluir o objeto do bucket usando métodos corretos da API
    const result = await client.deleteObject({
      bucketName: BUCKET_NAME,
      key: objectKey
    });
    
    if (!result.ok) {
      console.error(`Falha ao excluir objeto: ${result.error}`);
      return false;
    }
    
    console.log(`Imagem removida com sucesso do Object Storage: ${objectKey}`);
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo do Object Storage:', error);
    return false;
  }
}