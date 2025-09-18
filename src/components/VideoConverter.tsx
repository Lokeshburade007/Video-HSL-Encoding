// import React, { useState, useRef, useEffect } from 'react';
// import { FFmpeg } from '@ffmpeg/ffmpeg';
// import { fetchFile, toBlobURL } from '@ffmpeg/util';
// import JSZip from 'jszip';
// import { Upload, FileVideo, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// interface ProcessingStatus {
//   stage: 'idle' | 'loading' | 'analyzing' | 'converting' | 'packaging' | 'complete' | 'error';
//   progress: number;
//   message: string;
// }

// interface VideoQuality {
//   width: number;
//   height: number;
//   label: string;
//   bitrate: string;
// }

// const VideoConverter: React.FC = () => {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [status, setStatus] = useState<ProcessingStatus>({
//     stage: 'idle',
//     progress: 0,
//     message: 'Ready to process video'
//   });
//   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
//   const [dragActive, setDragActive] = useState(false);
//   const [ffmpegLoaded, setFFmpegLoaded] = useState(false);

//   const ffmpegRef = useRef(new FFmpeg());
//   const fileInputRef = useRef<HTMLInputElement>(null);


//   const loadFFmpeg = async () => {
//     if (ffmpegLoaded) return;

//     const ffmpeg = ffmpegRef.current;

//     try {
//       setStatus({ stage: 'loading', progress: 10, message: 'Loading FFmpeg...' });

//       const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';

//       ffmpeg.on('log', ({ message }) => {
//         console.log('FFmpeg log:', message);
//       });

//       ffmpeg.on('progress', ({ progress }) => {
//         if (status.stage === 'converting') {
//           setStatus(prev => ({
//             ...prev,
//             progress: Math.min(20 + (progress * 60), 80),
//             message: `Converting video... ${Math.round(progress * 100)}%`
//           }));
//         }
//       });

//       await ffmpeg.load({
//         coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
//         wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
//         workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
//       });

//       setFFmpegLoaded(true);
//       setStatus({ stage: 'idle', progress: 0, message: 'FFmpeg loaded. Ready to convert!' });
//     } catch (error) {
//       console.error('FFmpeg loading error:', error);
//       setStatus({ stage: 'error', progress: 0, message: 'Failed to load FFmpeg. Please refresh and try again.' });
//     }
//   };

//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === 'dragenter' || e.type === 'dragover') {
//       setDragActive(true);
//     } else if (e.type === 'dragleave') {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     const files = Array.from(e.dataTransfer.files);
//     const videoFile = files.find(file =>
//       file.type === 'video/mp4' || file.type === 'video/quicktime' ||
//       file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov')
//     );

//     if (videoFile) {
//       setSelectedFile(videoFile);
//       setStatus({ stage: 'idle', progress: 0, message: 'File selected. Click convert to process.' });
//     } else {
//       setStatus({ stage: 'error', progress: 0, message: 'Please select a valid MP4 or MOV file' });
//     }
//   };

//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime' ||
//       file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov'))) {
//       setSelectedFile(file);
//       setStatus({ stage: 'idle', progress: 0, message: 'Video selected. Click convert to process.' });
//     } else {
//       setStatus({ stage: 'error', progress: 0, message: 'Please select a valid MP4 or MOV file' });
//     }
//   };

//   const getVideoInfo = async (ffmpeg: FFmpeg): Promise<{ width: number; height: number }> => {
//     try {
//       // Use ffprobe-like command to get video info
//       await ffmpeg.exec(['-i', 'input.mp4', '-t', '1', '-f', 'null', '-']);
//       return { width: 1920, height: 1080 }; // Default for demo
//     } catch (error) {
//       // FFmpeg will throw an error but still process, we'll parse dimensions from a frame
//       return { width: 1920, height: 1080 }; // Fallback
//     }
//   };

//   const determineQualities = (width: number, height: number): VideoQuality[] => {
//     const qualities: VideoQuality[] = [];

//     // UHD/HD (1080p) or greater - generate 3 versions
//     if (height >= 1080) {
//       qualities.push(
//         { width: 1920, height: 1080, label: '1080p', bitrate: '5000k' },
//         { width: 1280, height: 720, label: '720p', bitrate: '2500k' },
//         { width: 854, height: 480, label: '480p', bitrate: '1000k' }
//       );
//     }
//     // SD (720p) or greater but less than HD - generate 2 versions
//     else if (height >= 720) {
//       qualities.push(
//         { width: 1280, height: 720, label: '720p', bitrate: '2500k' },
//         { width: 854, height: 480, label: '480p', bitrate: '1000k' }
//       );
//     }
//     // Less than SD - generate 1 version
//     else {
//       qualities.push(
//         { width: 854, height: 480, label: '480p', bitrate: '1000k' }
//       );
//     }

//     return qualities;
//   };

//   const convertToHLS = async () => {
//     if (!selectedFile) {
//       setStatus({ stage: 'error', progress: 0, message: 'Please select a video file first' });
//       return;
//     }

//     // Load FFmpeg if not already loaded
//     if (!ffmpegLoaded) {
//       await loadFFmpeg();
//       if (!ffmpegLoaded) {
//         return; // Loading failed, error already set
//       }
//     }

//     const ffmpeg = ffmpegRef.current;

//     try {
//       setStatus({ stage: 'analyzing', progress: 5, message: 'Analyzing video...' });

//       // Write input file
//       await ffmpeg.writeFile('input.mp4', await fetchFile(selectedFile));

//       setStatus({ stage: 'analyzing', progress: 15, message: 'Determining quality levels...' });

//       // For demo purposes, we'll assume HD quality. In production, you'd analyze the actual video
//       const videoInfo = { width: 1920, height: 1080 };
//       const qualities = determineQualities(videoInfo.width, videoInfo.height);

//       setStatus({ stage: 'converting', progress: 20, message: `Converting to ${qualities.length} quality level(s)...` });

//       const masterPlaylist: string[] = ['#EXTM3U', '#EXT-X-VERSION:3'];
//       const generatedFiles: string[] = [];

//       // Convert each quality
//       for (let i = 0; i < qualities.length; i++) {
//         const quality = qualities[i];
//         const progressBase = 20 + (i * 50 / qualities.length);

//         setStatus({
//           stage: 'converting',
//           progress: progressBase,
//           message: `Converting ${quality.label}...`
//         });

//         // Generate HLS for this quality
//         await ffmpeg.exec([
//           '-i', 'input.mp4',
//           '-vf', `scale=${quality.width}:${quality.height}`,
//           '-c:v', 'libx264',
//           '-b:v', quality.bitrate,
//           '-c:a', 'aac',
//           '-b:a', '128k',
//           '-hls_time', '6',
//           '-hls_list_size', '0',
//           '-hls_segment_filename', `${quality.label}_%d.ts`,
//           '-f', 'hls',
//           `${quality.label}.m3u8`
//         ]);

//         // Calculate bandwidth for master playlist
//         const bandwidth = parseInt(quality.bitrate.replace('k', '')) * 1000 + 128000; // video + audio

//         // Add to master playlist
//         masterPlaylist.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.width}x${quality.height}`);
//         masterPlaylist.push(`${quality.label}.m3u8`);

//         // Add playlist file to generated files
//         generatedFiles.push(`${quality.label}.m3u8`);

//         console.log(`Generated ${quality.label} playlist`);
//       }

//       setStatus({ stage: 'packaging', progress: 80, message: 'Creating master manifest...' });

//       // Create master manifest
//       const masterContent = masterPlaylist.join('\n');
//       await ffmpeg.writeFile('manifest.m3u8', masterContent);
//       generatedFiles.push('manifest.m3u8');

//       setStatus({ stage: 'packaging', progress: 90, message: 'Packaging files...' });

//       // Create zip file
//       const zip = new JSZip();

//       // Add master manifest
//       const masterData = await ffmpeg.readFile('manifest.m3u8');
//       zip.file('manifest.m3u8', masterData);

//       // Add all quality playlists and segments
//       for (const quality of qualities) {
//         try {
//           // Add playlist
//           const playlistData = await ffmpeg.readFile(`${quality.label}.m3u8`);
//           zip.file(`${quality.label}.m3u8`, playlistData);

//           // Read the playlist to get actual segment names
//           const playlistContent = new TextDecoder().decode(playlistData as Uint8Array);
//           const segmentLines = playlistContent.split('\n').filter(line => line.endsWith('.ts'));

//           // Add segments
//           for (const segmentName of segmentLines) {
//             try {
//               const segmentData = await ffmpeg.readFile(segmentName);
//               zip.file(segmentName, segmentData);
//             } catch (segError) {
//               console.warn(`Could not read segment: ${segmentName}`);
//             }
//           }
//         } catch (error) {
//           console.warn(`Could not read playlist: ${quality.label}.m3u8`);
//         }
//       }

//       setStatus({ stage: 'packaging', progress: 95, message: 'Generating download...' });

//       const zipBlob = await zip.generateAsync({ type: 'blob' });
//       const downloadUrl = URL.createObjectURL(zipBlob);
//       setDownloadUrl(downloadUrl);

//       setStatus({ stage: 'complete', progress: 100, message: 'Conversion complete! Download ready.' });

//     } catch (error) {
//       console.error('Conversion error:', error);
//       setStatus({
//         stage: 'error',
//         progress: 0,
//         message: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
//       });
//     }
//   };

//   const resetConverter = () => {
//     setSelectedFile(null);
//     setDownloadUrl(null);
//     setStatus({ stage: 'idle', progress: 0, message: 'Ready to process video' });
//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-6">
//       <div className="text-center space-y-2">
//         <h1 className="text-3xl font-bold text-gray-900">Video to HLS Converter</h1>
//         <p className="text-gray-600">Convert your videos to adaptive bitrate HLS streaming format</p>
//       </div>

//       {/* File Upload Area */}
//       <div
//         className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
//             ? 'border-blue-500 bg-blue-50'
//             : selectedFile
//               ? 'border-green-500 bg-green-50'
//               : 'border-gray-300 hover:border-gray-400'
//           }`}
//         onDragEnter={handleDrag}
//         onDragLeave={handleDrag}
//         onDragOver={handleDrag}
//         onDrop={handleDrop}
//       >
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="video/mp4,video/quicktime,.mp4,.mov"
//           onChange={handleFileSelect}
//           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
//           disabled={status.stage === 'loading' || status.stage === 'converting' || status.stage === 'analyzing' || status.stage === 'packaging'}
//         />

//         <div className="space-y-4">
//           {selectedFile ? (
//             <FileVideo className="mx-auto h-12 w-12 text-green-500" />
//           ) : (
//             <Upload className="mx-auto h-12 w-12 text-gray-400" />
//           )}

//           <div>
//             {selectedFile ? (
//               <div>
//                 <p className="text-lg font-medium text-green-700">{selectedFile.name}</p>
//                 <p className="text-sm text-gray-500">
//                   {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
//                 </p>
//               </div>
//             ) : (
//               <div>
//                 <p className="text-lg font-medium text-gray-700">
//                   Drag and drop your video here, or click to select
//                 </p>
//                 <p className="text-sm text-gray-500">Supports MP4 and MOV files only</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Status Display */}
//       <div className="bg-white border rounded-lg p-6 shadow-sm">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-medium text-gray-900">Processing Status</h3>
//           <div className="flex items-center space-x-2">
//             {status.stage === 'loading' || status.stage === 'analyzing' || status.stage === 'converting' || status.stage === 'packaging' ? (
//               <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
//             ) : status.stage === 'complete' ? (
//               <CheckCircle className="h-5 w-5 text-green-500" />
//             ) : status.stage === 'error' ? (
//               <AlertCircle className="h-5 w-5 text-red-500" />
//             ) : null}
//           </div>
//         </div>

//         <div className="space-y-3">
//           <div className="flex justify-between text-sm">
//             <span className="text-gray-600">{status.message}</span>
//             <span className="text-gray-900 font-medium">{status.progress}%</span>
//           </div>

//           <div className="w-full bg-gray-200 rounded-full h-2">
//             <div
//               className={`h-2 rounded-full transition-all duration-300 ${status.stage === 'error' ? 'bg-red-500' :
//                   status.stage === 'complete' ? 'bg-green-500' : 'bg-blue-500'
//                 }`}
//               style={{ width: `${status.progress}%` }}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className="flex justify-center space-x-4">
//         <button
//           onClick={convertToHLS}
//           disabled={!selectedFile || (status.stage !== 'idle' && status.stage !== 'error')}
//           className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
//         >
//           {status.stage === 'converting' || status.stage === 'analyzing' || status.stage === 'packaging' ? 'Processing...' : 'Convert to HLS'}
//         </button>

//         {downloadUrl && (
//           <a
//             href={downloadUrl}
//             download={`${selectedFile?.name?.split('.')[0] || 'video'}_hls.zip`}
//             className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"
//           >
//             <Download className="h-5 w-5" />
//             <span>Download HLS Package</span>
//           </a>
//         )}

//         {(selectedFile || downloadUrl) && (
//           <button
//             onClick={resetConverter}
//             disabled={status.stage === 'converting' || status.stage === 'analyzing' || status.stage === 'packaging'}
//             className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
//           >
//             Reset
//           </button>
//         )}
//       </div>

//       {/* Info Panel */}
//       <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
//         <h4 className="text-lg font-medium text-blue-900 mb-3">How it works</h4>
//         <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
//           <div>
//             <h5 className="font-medium mb-2">Quality Levels Generated:</h5>
//             <ul className="space-y-1">
//               <li>• <strong>UHD/HD+ (1080p+):</strong> Creates 1080p, 720p, 480p versions</li>
//               <li>• <strong>SD+ (720p+):</strong> Creates 720p, 480p versions</li>
//               <li>• <strong>Below SD:</strong> Creates 480p version only</li>
//             </ul>
//           </div>
//           <div>
//             <h5 className="font-medium mb-2">Output Package Contains:</h5>
//             <ul className="space-y-1">
//               <li>• HLS segments (480p_0.ts, 480p_1.ts, ...)</li>
//               <li>• Quality playlists (720p.m3u8, 480p.m3u8, ...)</li>
//               <li>• Master manifest (manifest.m3u8)</li>
//               <li>• Complete ZIP package ready for upload</li>
//             </ul>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VideoConverter;

import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip';

type Stage = 'idle' | 'loading' | 'ready' | 'analyzing' | 'converting' | 'packaging' | 'done' | 'error';

const HlsConverterMini: React.FC = () => {
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const videoProbeRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (ffmpegReady) return;
        setStage('loading');
        // Use single-thread core to avoid COOP/COEP issues in local dev
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;

      ffmpeg.on('log', ({ message }) => {
          // Helpful to see what's happening under the hood
          console.log('[ffmpeg]', message);
      });
      ffmpeg.on('progress', ({ progress }) => {
          if (stage === 'converting') setProgress(Math.floor(20 + progress * 60));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegReady(true);
        setStage('ready');
      } catch (e) {
        console.error(e);
        // Do not loop reloads; keep in idle and load on-demand via button
        setStage('idle');
      }
    };
    load();
  }, [ffmpegReady]);

  const onSelect = (f: File | null) => {
    if (!f) return;
    const isVideo = f.type === 'video/mp4' || f.type === 'video/quicktime' || /\.mp4$|\.mov$/i.test(f.name);
    if (!isVideo) {
      alert('Please choose MP4 or MOV only');
      return;
    }
    setFile(f);
    setDownloadUrl(null);
    setStage(ffmpegReady ? 'ready' : 'loading');
  };

  const getTargetQualities = (height: number) => {
    if (height >= 1080) {
      return [
        { label: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
        { label: '720p', width: 1280, height: 720, bitrate: '2500k' },
        { label: '480p', width: 854, height: 480, bitrate: '1000k' },
      ];
    } else if (height >= 720) {
      return [
        { label: '720p', width: 1280, height: 720, bitrate: '2500k' },
        { label: '480p', width: 854, height: 480, bitrate: '1000k' },
      ];
    } else {
      return [{ label: '480p', width: 854, height: 480, bitrate: '1000k' }];
    }
  };

  const analyzeVideoDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      videoProbeRef.current = video;
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error('Failed to read video metadata'));
      video.src = URL.createObjectURL(file);
    });
  };

  const ensureFfmpegLoaded = async () => {
    if (ffmpegReady) return true;
    try {
      setStage('loading');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setFfmpegReady(true);
      setStage('ready');
      return true;
    } catch (e) {
      console.error('FFmpeg load failed on-demand', e);
      setStage('idle');
      return false;
    }
  };

  const convert = async () => {
    if (!file) return;
    // Lazy-load FFmpeg if not ready when user clicks
    const ok = await ensureFfmpegLoaded();
    if (!ok) return;
    const ffmpeg = ffmpegRef.current;

    try {
      setStage('analyzing');
      setProgress(5);

      const { height } = await analyzeVideoDimensions(file);
      const qualities = getTargetQualities(height);

      setProgress(10);
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));

      setStage('converting');
      setProgress(20);

      const masterLines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3'];

      for (let i = 0; i < qualities.length; i++) {
        const q = qualities[i];
        // ffmpeg command to produce HLS with named segments like 720p_0.ts, 720p_1.ts ...
        await ffmpeg.exec([
          '-i', 'input.mp4',
          '-vf', `scale=${q.width}:${q.height}`,
          '-c:v', 'libx264',
          '-b:v', q.bitrate,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-hls_time', '6',
          '-hls_list_size', '0',
          '-start_number', '0',
          '-hls_segment_filename', `${q.label}_%d.ts`,
          '-f', 'hls',
          `${q.label}.m3u8`,
        ]);

        const videoKbps = parseInt(q.bitrate.replace('k', '')) * 1000;
        const bandwidth = videoKbps + 128000;

        masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${q.width}x${q.height}`);
        masterLines.push(`${q.label}.m3u8`);
      }

      setStage('packaging');
      setProgress(85);

      // Write master manifest into FS
      const masterContent = masterLines.join('\n');
      await ffmpeg.writeFile('manifest.m3u8', masterContent);

      const zip = new JSZip();
      // Add master
      const masterData = await ffmpeg.readFile('manifest.m3u8');
      zip.file('manifest.m3u8', masterData as Uint8Array);

      // Add playlists and their segments
      for (const q of qualities) {
        try {
          const playlistData = await ffmpeg.readFile(`${q.label}.m3u8`);
          zip.file(`${q.label}.m3u8`, playlistData as Uint8Array);

          const text = new TextDecoder().decode(playlistData as Uint8Array);
          const segmentNames = text.split('\n').filter((l) => l.trim().endsWith('.ts'));
          for (const seg of segmentNames) {
            try {
              const segData = await ffmpeg.readFile(seg);
              zip.file(seg, segData as Uint8Array);
            } catch {
              // ignore missing seg edge-cases
            }
          }
        } catch {
          // ignore missing playlist
        }
      }

      setProgress(95);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setStage('done');
    } catch (e) {
      console.error(e);
      setStage('error');
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] || null;
    if (f) onSelect(f);
  };

  return (
    <div style={{ maxWidth: 640, margin: '24px auto', padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Video to HLS (Mini)</h3>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{ padding: 16, border: '2px dashed #cbd5e1', borderRadius: 8, textAlign: 'center', marginBottom: 12 }}
      >
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={(e) => onSelect(e.target.files?.[0] || null)}
        />
        <div style={{ marginTop: 8, color: '#64748b' }}>
          {file ? <span>{file.name}</span> : <span>Drag & drop ya file select karein (MP4/MOV)</span>}
        </div>
      </div>

      <button
        onClick={convert}
        disabled={!file || stage === 'loading' || stage === 'converting' || stage === 'packaging'}
        style={{ padding: '10px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 0, cursor: 'pointer' }}
      >
        {stage === 'converting' || stage === 'packaging' ? 'Processing…' : 'Convert to HLS'}
      </button>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <div>Status: {stage}</div>
        <div>Progress: {progress}%</div>
      </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
          download={`${file?.name?.replace(/\.(mp4|mov)$/i, '') || 'video'}_hls.zip`}
          style={{ display: 'inline-block', marginTop: 12, color: '#16a34a' }}
          >
          Download ZIP (HLS)
          </a>
        )}
    </div>
  );
};

export default HlsConverterMini;