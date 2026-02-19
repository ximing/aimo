/**
 * Fun-ASR Speech-to-Text DTOs
 */

export interface ASRTranscribeRequestDto {
  /** Array of audio/video file URLs to transcribe */
  fileUrls: string[];
  /**
   * Optional language hints for the audio
   * e.g., ['zh', 'en'] for Chinese and English
   * @see https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-open-api-with-native-api
   */
  languageHints?: string[];
  /**
   * Optional callback URL for async notification
   */
  callbackUrl?: string;
}

export interface ASRTaskResponseDto {
  /** Task ID for querying transcription status */
  taskId: string;
  /** Request ID from the API */
  requestId: string;
  /** Task status */
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
}

export interface ASRTaskStatusDto {
  /** Task ID */
  taskId: string;
  /** Request ID */
  requestId: string;
  /** Task status */
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  /** Error message if failed */
  message?: string;
  /** Completion time if succeeded (Unix timestamp in milliseconds) */
  completedTime?: number;
}

export interface ASRTranscriptionResultDto {
  /** Original file URL */
  file_url: string;
  /** Audio properties */
  properties: {
    audio_format: string;
    channels: number[];
    original_sampling_rate: number;
    original_duration_in_milliseconds: number;
  };
  /** Transcription results */
  transcripts: ASRTranscriptDto[];
}

export interface ASRTranscriptDto {
  /** Channel ID */
  channel_id: number;
  /** Total content duration in milliseconds */
  content_duration_in_milliseconds: number;
  /** Full transcription text */
  text: string;
  /** Individual sentences with timestamps */
  sentences: ASRSentenceDto[];
}

export interface ASRSentenceDto {
  /** Sentence start time in milliseconds */
  begin_time: number;
  /** Sentence end time in milliseconds */
  end_time: number;
  /** Sentence text */
  text: string;
  /** Sentence ID */
  sentence_id: number;
  /** Word-level timestamps */
  words: ASRWordDto[];
}

export interface ASRWordDto {
  /** Word start time in milliseconds */
  begin_time: number;
  /** Word end time in milliseconds */
  end_time: number;
  /** Word text */
  text: string;
  /** Punctuation after the word */
  punctuation: string;
}

export interface ASRResultDto {
  /** Array of transcription results (one per file) */
  results: ASRTranscriptionResultDto[];
  /** Task status */
  status: 'SUCCEEDED' | 'FAILED';
  /** Request ID */
  requestId: string;
}
