import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { Request } from 'express';

// Garantir que a pasta de uploads existe
const uploadsDir = path.join(process.cwd(), 'uploads');
const propertiesDir = path.join(uploadsDir, 'properties');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(propertiesDir);

// Configuração do armazenamento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, propertiesDir);
  },
  filename: (req, file, cb) => {
    // Criar um nome único para o arquivo com data e extensão original
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `property-${uniqueSuffix}${ext}`);
  },
});

// Filtro para aceitar apenas imagens PNG ou JPEG/JPG
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('A imagem deve ser PNG ou JPEG'));
  }
};

// Configuração do upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB - limite configurado conforme requisito
  },
});

// Função para obter URL pública para as imagens
export function getPublicUrl(filename: string): string {
  return `/uploads/properties/${filename}`;
}

// Função para remover arquivo
export async function removeFile(filename: string): Promise<boolean> {
  try {
    if (!filename) return true;
    
    const filePath = path.join(propertiesDir, path.basename(filename));
    
    // Verificar se o arquivo existe
    const exists = await fs.pathExists(filePath);
    if (!exists) return true;
    
    // Remover o arquivo
    await fs.remove(filePath);
    return true;
  } catch (error) {
    console.error('Erro ao remover arquivo:', error);
    return false;
  }
}