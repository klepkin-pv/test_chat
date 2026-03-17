import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import mime from 'mime-types';
import type { Response } from 'express';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml'
]);

// Создаем папки для загрузок если их нет
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const filesDir = path.join(uploadsDir, 'files');
const thumbsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, imagesDir, filesDir, thumbsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Конфигурация хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const uploadPath = isImage ? imagesDir : filesDir;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Фильтр файлов
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Разрешенные типы файлов
  const allowedMimes = [
    // Изображения
    ...IMAGE_MIME_TYPES,
    // Документы
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    // Архивы
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`));
  }
};

// Настройки multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
    files: 5 // Максимум 5 файлов за раз
  }
});

export function singleUpload(fieldName: string) {
  return upload.single(fieldName);
}

export function handleUploadError(res: Response, error: unknown) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 10MB' });
    }

    return res.status(400).json({ error: error.message });
  }

  if (error instanceof Error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Upload failed' });
}

export function saveImageDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  const [, mimeType, base64Payload] = match;
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const fileExtension = mime.extension(mimeType);
  if (!fileExtension) {
    throw new Error(`Could not determine file extension for ${mimeType}`);
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error('File is too large. Maximum size is 10MB');
  }

  const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
  fs.writeFileSync(path.join(imagesDir, filename), buffer);

  return `/uploads/images/${filename}`;
}

// Функция для создания миниатюр изображений
export const createThumbnail = async (imagePath: string, filename: string): Promise<string> => {
  try {
    const thumbnailPath = path.join(thumbsDir, `thumb_${filename}`);
    
    await sharp(imagePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw error;
  }
};

// Функция для получения информации о файле
export const getFileInfo = (filePath: string) => {
  const stats = fs.statSync(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  
  return {
    size: stats.size,
    mimeType,
    isImage: mimeType.startsWith('image/'),
    createdAt: stats.birthtime
  };
};

// Функция для удаления файла
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
