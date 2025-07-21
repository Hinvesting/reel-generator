import React, { useRef, useState } from 'react';
import type { Scene } from '../types';
import { PlayIcon, PauseIcon, UploadIcon, RegenerateIcon, EditIcon, DragHandleIcon } from './icons';
import Spinner from './Spinner';

interface SceneCardProps {
  scene: Scene;
  onPlayTTS: (text: string, sceneNumber: number) => void;
  onPauseAudio: () => void;
  onAudioUpload: (file: File, sceneNumber: number) => void;
  currentlyPlaying: { type: string; sceneNumber: number } | null;
  onRegenerate: (sceneNumber: number) => void;
  onUpdateScene: (sceneNumber: number, voiceover: string, visualPrompt: string) => void;
  isAnyGenerationInProgress: boolean;
}

const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onPlayTTS,
  onPauseAudio,
  onAudioUpload,
  currentlyPlaying,
  onRegenerate,
  onUpdateScene,
  isAnyGenerationInProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVoiceover, setEditedVoiceover] = useState(scene.voiceover);
  const [editedVisualPrompt, setEditedVisualPrompt] = useState(scene.visualPrompt);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAudioUpload(file, scene.sceneNumber);
    }
  };
  
  const handleRegenerateClick = () => {
    if (!scene.isGeneratingImage) {
      onRegenerate(scene.sceneNumber);
    }
  };

  const handleSaveEdit = () => {
    onUpdateScene(scene.sceneNumber, editedVoiceover, editedVisualPrompt);
    setIsEditing(false);
  }

  const handleCancelEdit = () => {
    setEditedVoiceover(scene.voiceover);
    setEditedVisualPrompt(scene.visualPrompt);
    setIsEditing(false);
  }

  const isPlayingTTS = currentlyPlaying?.type === 'tts' && currentlyPlaying.sceneNumber === scene.sceneNumber;

  return (
    <div className="bg-dark-card rounded-xl overflow-hidden shadow-lg transition-all duration-300 ease-in-out flex flex-col border border-dark-border">
      <div className="aspect-[9/16] bg-dark-bg relative flex items-center justify-center">
        {scene.isGeneratingImage ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Spinner />
            <span>Generating Image...</span>
          </div>
        ) : scene.videoUrl ? (
          <video src={scene.videoUrl} muted={!!scene.audioUrl} controls className="w-full h-full object-cover bg-black" />
        ) : scene.imageUrl ? (
          <img src={scene.imageUrl} alt={`Visual for scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 text-center p-4">Image or video will appear here</div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold font-heading text-lg text-secondary-sky">Scene {scene.sceneNumber}</h3>
            <div className="flex items-center gap-1">
              <button
                  onClick={() => setIsEditing(true)}
                  disabled={isAnyGenerationInProgress || isEditing}
                  className="p-1.5 rounded-full text-gray-400 hover:bg-dark-bg hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Edit Scene Text"
                  aria-label="Edit scene text"
              >
                  <EditIcon className="w-5 h-5" />
              </button>
              {!scene.videoUrl && (
                <button
                    onClick={handleRegenerateClick}
                    disabled={isAnyGenerationInProgress}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-dark-bg hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Regenerate Image"
                    aria-label="Regenerate image for this scene"
                >
                    <RegenerateIcon className="w-5 h-5" />
                </button>
              )}
               <div title="Drag to reorder" className="cursor-grab p-1.5 text-gray-500">
                  <DragHandleIcon className="w-5 h-5" />
               </div>
            </div>
        </div>

        <div className="space-y-3 font-mono text-sm flex-grow flex flex-col">
          <div>
            <span className="font-semibold text-gray-400">VOICEOVER:</span>
            {isEditing ? (
              <textarea value={editedVoiceover} onChange={(e) => setEditedVoiceover(e.target.value)} rows={4} className="mt-1 w-full p-2 bg-primary-blue border border-dark-border rounded-md text-secondary-silver text-sm focus:ring-1 focus:ring-primary-gold"/>
            ) : (
              <p className="text-gray-300 mt-1">{scene.voiceover}</p>
            )}
          </div>
          <div className="mt-2">
            <span className="font-semibold text-gray-400">VISUAL PROMPT / DESCRIPTION:</span>
             {isEditing ? (
              <textarea 
                value={editedVisualPrompt} 
                onChange={(e) => setEditedVisualPrompt(e.target.value)} 
                rows={6} 
                className="mt-1 w-full p-2 bg-primary-blue border border-dark-border rounded-md text-secondary-silver text-sm focus:ring-1 focus:ring-primary-gold"
                placeholder={scene.videoUrl ? 'Description for the uploaded video.' : 'AI prompt to generate the visual.'}
              />
            ) : (
              <p className="text-gray-300 mt-1">{scene.visualPrompt || (scene.videoUrl && <i>Video scene, no prompt.</i>)}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={handleCancelEdit} className="px-3 py-1 text-xs font-medium text-gray-300 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
              <button onClick={handleSaveEdit} className="px-3 py-1 text-xs font-medium text-white bg-secondary-sky rounded hover:opacity-90">Save</button>
            </div>
          )}
        </div>
        
        <div className="space-y-3 mt-4 pt-4 border-t border-dark-border">
          {scene.audioUrl ? (
             <audio controls src={scene.audioUrl} className="w-full h-10">
                Your browser does not support the audio element.
             </audio>
          ) : (
            <button
              onClick={() => isPlayingTTS ? onPauseAudio() : onPlayTTS(scene.voiceover, scene.sceneNumber)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-secondary-sky border border-transparent rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold focus:ring-offset-dark-card transition-colors"
            >
              {isPlayingTTS ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
              {isPlayingTTS ? 'Pause' : 'Play Generated Voice'}
            </button>
          )}

          <div className="flex items-center">
              <div className="flex-grow border-t border-dark-border"></div>
              <span className="flex-shrink mx-2 text-gray-500 text-xs">OR</span>
              <div className="flex-grow border-t border-dark-border"></div>
          </div>
          
          <button
            onClick={handleUploadClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-dark-bg border border-dark-border rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-dark-card transition-colors"
          >
            <UploadIcon className="w-5 h-5" />
            Upload Voiceover
          </button>
          <input
            type="file"
            accept="audio/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default SceneCard;