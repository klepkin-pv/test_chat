'use client'

import { useState } from 'react';
import { Download, Eye, File, Image as ImageIcon, FileText, Archive, X } from 'lucide-react';
import { buildAbsoluteUrl } from '@/utils/api';

interface FileMessageProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl?: string;
  isImage: boolean;
  className?: string;
}

export default function FileMessage({
  fileUrl,
  fileName,
  fileSize,
  thumbnailUrl,
  isImage,
  className = ''
}: FileMessageProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [imageError, setImageError] = useState(false);

  const thumbnailSrc = buildAbsoluteUrl(thumbnailUrl);
  const fileSrc = buildAbsoluteUrl(fileUrl);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (isImage) {
      return <ImageIcon size={20} className="text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText size={20} className="text-red-500" />;
    } else if (['doc', 'docx', 'txt'].includes(extension || '')) {
      return <FileText size={20} className="text-blue-600" />;
    } else if (['zip', 'rar', '7z'].includes(extension || '')) {
      return <Archive size={20} className="text-yellow-500" />;
    } else {
      return <File size={20} className="text-gray-500" />;
    }
  };

  const handleDownload = () => {
    if (!fileSrc) {
      return;
    }

    const link = document.createElement('a');
    link.href = fileSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    if (isImage) {
      setShowPreview(true);
      return;
    }

    if (fileSrc) {
      window.open(fileSrc, '_blank');
    }
  };

  return (
    <>
      <div className={`max-w-sm ${className}`}>
        {isImage && thumbnailSrc && !imageError ? (
          <div className="relative group">
            <img
              src={thumbnailSrc}
              alt={fileName}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handlePreview}
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={handlePreview}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                  title="Просмотр"
                >
                  <Eye size={16} className="text-gray-700" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                  title="Скачать"
                >
                  <Download size={16} className="text-gray-700" />
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {fileName} • {formatFileSize(fileSize)}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <div className="flex-shrink-0">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(fileSize)}
              </p>
            </div>
            <div className="flex space-x-1">
              {!isImage && (
                <button
                  onClick={handlePreview}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Просмотр"
                >
                  <Eye size={16} />
                </button>
              )}
              <button
                onClick={handleDownload}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Скачать"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreview && isImage && fileSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={fileSrc}
              alt={fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs opacity-75">{formatFileSize(fileSize)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
