'use client'

import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Archive } from 'lucide-react';
import { FILES_API_URL } from '@/utils/api';

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  isImage: boolean;
  url: string;
  thumbnailUrl?: string;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onClose: () => void;
  maxFiles?: number;
  maxSize?: number;
}

export default function FileUpload({
  onFilesUploaded,
  onClose,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length > maxFiles) {
      setError(`Максимум ${maxFiles} файлов за раз`);
      return;
    }

    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Файлы слишком большие. Максимум ${formatFileSize(maxSize)}`);
      return;
    }

    setSelectedFiles(files);
    setError('');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);

    if (files.length > maxFiles) {
      setError(`Максимум ${maxFiles} файлов за раз`);
      return;
    }

    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Файлы слишком большие. Максимум ${formatFileSize(maxSize)}`);
      return;
    }

    setSelectedFiles(files);
    setError('');
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${FILES_API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки');
      }

      const result = await response.json();
      onFilesUploaded(result.files);
      onClose();

    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Ошибка загрузки файлов');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
      return <FileText size={20} className="text-red-500" />;
    } else if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z')) {
      return <Archive size={20} className="text-yellow-500" />;
    } else {
      return <File size={20} className="text-gray-500" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full animate-bounce-in">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Загрузить файлы
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Перетащите файлы сюда или нажмите для выбора
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Максимум {maxFiles} файлов, до {formatFileSize(maxSize)} каждый
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
            />

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Выбранные файлы:
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto chat-scrollbar">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fade-in"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={uploadFiles}
              disabled={selectedFiles.length === 0 || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {uploading ? 'Загрузка...' : `Загрузить (${selectedFiles.length})`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
