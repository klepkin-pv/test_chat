import express from 'express';
import path from 'path';
import fs from 'fs';
import { upload, createThumbnail, getFileInfo } from '../middleware/upload.js';

const router = express.Router();

// Загрузка файлов
router.post('/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не выбраны' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileInfo = getFileInfo(file.path);
      
      let thumbnailUrl = null;
      
      // Создаем миниатюру для изображений
      if (fileInfo.isImage) {
        try {
          const thumbnailPath = await createThumbnail(file.path, file.filename);
          thumbnailUrl = `/api/files/thumbnail/${path.basename(thumbnailPath)}`;
        } catch (error) {
          console.warn('Failed to create thumbnail:', error);
        }
      }

      uploadedFiles.push({
        id: file.filename,
        originalName: file.originalname,
        filename: file.filename,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        isImage: fileInfo.isImage,
        url: `/api/files/${file.filename}`,
        thumbnailUrl,
        uploadedAt: new Date()
      });
    }

    res.json({
      message: 'Файлы успешно загружены',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Ошибка загрузки файлов' 
    });
  }
});

// Получение файла
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Проверяем в папке изображений
    let filePath = path.join(process.cwd(), 'uploads', 'images', filename);
    
    if (!fs.existsSync(filePath)) {
      // Проверяем в папке файлов
      filePath = path.join(process.cwd(), 'uploads', 'files', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const fileInfo = getFileInfo(filePath);
    
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Length', fileInfo.size);
    
    // Для изображений разрешаем кеширование
    if (fileInfo.isImage) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 часа
    }
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Ошибка получения файла' });
  }
});

// Получение миниатюры
router.get('/thumbnail/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', filename);
    
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ error: 'Миниатюра не найдена' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 часа
    
    const fileStream = fs.createReadStream(thumbnailPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Thumbnail serve error:', error);
    res.status(500).json({ error: 'Ошибка получения миниатюры' });
  }
});

// Удаление файла
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Пути к файлам
    const imagePath = path.join(process.cwd(), 'uploads', 'images', filename);
    const filePath = path.join(process.cwd(), 'uploads', 'files', filename);
    const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', `thumb_${filename}`);
    
    let deleted = false;
    
    // Удаляем основной файл
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      deleted = true;
    } else if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
    
    // Удаляем миниатюру если есть
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
    
    if (deleted) {
      res.json({ message: 'Файл успешно удален' });
    } else {
      res.status(404).json({ error: 'Файл не найден' });
    }

  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

// Получение информации о файле
router.get('/info/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    let filePath = path.join(process.cwd(), 'uploads', 'images', filename);
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'uploads', 'files', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const fileInfo = getFileInfo(filePath);
    
    res.json({
      filename,
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
      isImage: fileInfo.isImage,
      createdAt: fileInfo.createdAt
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Ошибка получения информации о файле' });
  }
});

export default router;