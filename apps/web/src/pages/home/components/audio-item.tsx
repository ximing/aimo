import { useState, useRef, useEffect, useCallback } from 'react';
import type { AttachmentDto } from '@aimo/dto';
import { Volume2 } from 'lucide-react';
import { toast } from '../../../services/toast.service';

interface AudioItemProps {
  attachment: AttachmentDto;
  isDownloading?: boolean;
}

export const AudioItem = ({ attachment, isDownloading }: AudioItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Calculate width based on duration or size
  const getWidth = useCallback(() => {
    const properties = attachment.properties as Record<string, unknown> | undefined;

    if (properties?.duration && typeof properties.duration === 'number') {
      const duration = properties.duration as number;
      const minWidth = 100;
      const maxWidth = 360;
      const calculatedWidth = Math.min(duration * 5, maxWidth);
      return Math.max(calculatedWidth, minWidth);
    }

    if (attachment.size) {
      const minWidth = 100;
      const maxWidth = 360;
      const estimatedDuration = attachment.size / (16 * 1024);
      const calculatedWidth = Math.min(estimatedDuration * 5, maxWidth);
      return Math.max(calculatedWidth, minWidth);
    }

    return 100;
  }, [attachment.properties, attachment.size]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    // If already playing this audio, pause it
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Create new audio and play
    const audio = new Audio(attachment.url);
    audioRef.current = audio;
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.onerror = () => {
      console.error('Audio playback failed:', attachment.filename);
      toast.error('播放失败，请重试');
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error('Audio play error:', err);
      toast.error('播放失败，请重试');
      setIsPlaying(false);
      audioRef.current = null;
    });
  };

  const properties = attachment.properties as Record<string, unknown> | undefined;
  const duration = properties?.duration as number | undefined;
  const width = getWidth();

  return (
    <button
      onClick={handleClick}
      disabled={isDownloading}
      className={`relative flex items-center gap-2 px-2.5 py-2 border rounded transition-colors cursor-pointer focus:outline-none disabled:opacity-50 group ${
        isPlaying
          ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30'
          : 'bg-gray-100 dark:bg-dark-700 border-gray-200 dark:border-dark-600 hover:bg-gray-200 dark:hover:bg-dark-600'
      }`}
      style={{ width: `${width}px`, minWidth: '100px' }}
      title={`点击${isPlaying ? '暂停' : '播放'}: ${attachment.filename}`}
    >
      {/* Top arrow */}
      <div
        className={`absolute -top-1.5 left-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] ${
          isPlaying
            ? 'border-b-primary-200 dark:border-b-primary-800'
            : 'border-b-gray-200 dark:border-b-dark-600'
        }`}
      />

      {/* Volume icon with animation when playing */}
      {isPlaying ? (
        <div className="w-4 h-4 flex-shrink-0 animate-pulse">
          <Volume2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
      ) : (
        <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
      )}

      {/* Duration */}
      <span
        className={`text-xs truncate ${isPlaying ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
      >
        {duration ? formatDuration(duration) : formatFileSize(attachment.size)}
      </span>

      {/* Loading indicator */}
      {isDownloading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
};
