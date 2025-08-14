import path from 'path';
import fs from 'fs-extra';

// Configurações de armazenamento
const STORAGE_BASE_DIR = path.join(process.cwd(), 'uploads');
const PROPERTIES_DIR = path.join(STORAGE_BASE_DIR, 'properties');
const PUBLIC_BASE_URL = '/uploads/properties';

// Garantir que os diretórios necessários existam
export async function ensureStorageDirs() {
  try {
    // Criar diretórios se não existirem
    await fs.ensureDir(PROPERTIES_DIR);
    console.log('Diretórios de armazenamento verificados/criados com sucesso.');
  } catch (error) {
    console.error('Erro ao criar diretórios de armazenamento:', error);
    throw error;
  }
}

// Função para salvar um arquivo e retornar sua URL pública
export async function saveFile(filePath: string, originalFilename: string): Promise<string> {
  try {
    // Garantir que os diretórios existam
    await ensureStorageDirs();
    
    // Gerar um nome único para o arquivo
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `property-${Date.now()}-${Math.round(Math.random() * 1000000000)}${fileExtension}`;
    const destinationPath = path.join(PROPERTIES_DIR, uniqueFilename);
    
    // Copiar o arquivo para o destino
    await fs.copy(filePath, destinationPath);
    
    // Remover o arquivo temporário original
    try {
      await fs.remove(filePath);
    } catch (err) {
      console.warn('Aviso: Não foi possível remover o arquivo temporário', err);
    }
    
    // Gerar URL pública
    const publicUrl = `${PUBLIC_BASE_URL}/${uniqueFilename}`;
    
    console.log(`Arquivo salvo com sucesso: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error);
    throw error;
  }
}

// Função para excluir um arquivo pelo seu caminho público
export async function deleteFile(publicUrl: string): Promise<boolean> {
  try {
    if (!publicUrl || !publicUrl.startsWith(PUBLIC_BASE_URL)) {
      console.warn('URL inválida para exclusão:', publicUrl);
      return false;
    }
    
    // Extrair o nome do arquivo da URL
    const filename = path.basename(publicUrl);
    const filePath = path.join(PROPERTIES_DIR, filename);
    
    // Verificar se o arquivo existe
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      console.warn(`Arquivo não encontrado para exclusão: ${filePath}`);
      return true; // Consideramos sucesso se o arquivo já não existe
    }
    
    // Excluir o arquivo
    await fs.remove(filePath);
    console.log(`Arquivo excluído com sucesso: ${publicUrl}`);
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return false;
  }
}