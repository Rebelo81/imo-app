import { Client } from '@replit/object-storage';
import path from 'path';
import fs from 'fs';

// Inicializar o Object Storage
const storage = new Client();
const BUCKET_NAME = 'properties-images';

// Função para garantir que o bucket existe
async function ensureBucketExists() {
  try {
    // Verificar se o bucket já existe
    const bucketsResult = await storage.listBuckets();
    
    if (!bucketsResult.ok) {
      throw new Error(`Erro ao listar buckets: ${bucketsResult.error}`);
    }
    
    const bucketExists = bucketsResult.value.some((bucket: any) => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Criando bucket ${BUCKET_NAME}...`);
      const createResult = await storage.createBucket(BUCKET_NAME);
      
      if (!createResult.ok) {
        throw new Error(`Erro ao criar bucket: ${createResult.error}`);
      }
      
      console.log(`Bucket ${BUCKET_NAME} criado com sucesso!`);
    }
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
    throw error;
  }
}

// Função para fazer upload de arquivo para o Object Storage
export async function uploadToObjectStorage(filePath: string, originalFilename: string): Promise<string> {
  try {
    // Garantir que o bucket existe
    await ensureBucketExists();
    
    // Gerar um nome único para o arquivo
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.round(Math.random() * 1000000000)}${fileExtension}`;
    
    // Ler o arquivo do sistema de arquivos
    const fileContent = fs.readFileSync(filePath);
    
    // Fazer upload para o Object Storage
    const putResult = await storage.putObject(BUCKET_NAME, uniqueFilename, fileContent);
    
    if (!putResult.ok) {
      throw new Error(`Erro ao fazer upload do objeto: ${putResult.error}`);
    }
    
    // Retornar a URL pública do objeto
    const publicUrl = `https://${BUCKET_NAME}.replit.dev/${uniqueFilename}`;
    
    // Remover o arquivo temporário do sistema de arquivos
    fs.unlinkSync(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para o Object Storage:', error);
    throw error;
  }
}

// Função para excluir um arquivo do Object Storage
export async function deleteFromObjectStorage(fileUrl: string): Promise<boolean> {
  try {
    if (!fileUrl) return true;
    
    // Extrair o nome do arquivo da URL
    const filename = path.basename(fileUrl);
    
    // Excluir o objeto do bucket
    await storage.deleteObject(BUCKET_NAME, filename);
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo do Object Storage:', error);
    return false;
  }
}