'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  X,
  Crown,
  Sparkles,
  AlertCircle,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { speechEngine } from '@/lib/voice/speech-engine';
import { useSettings } from '@/lib/settings/settings-context';
import { GlassButton } from '@/components/ui/GlassButton';
import { generateContentClientDirect, getClientGeminiApiKey } from '@/lib/ai/client-runner';

type VoiceHelmStatus = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

interface VoiceHelmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatchMessage?: (message: string) => Promise<string>;
  lastAssistantReply?: string;
}

export const VoiceHelmSheet: React.FC<VoiceHelmSheetProps> = ({
  isOpen,
  onClose,
  onDispatchMessage,
  lastAssistantReply = "I'm Luffy, Captain of this vessel! What course are we setting today?",
}) => {
  const { isConfigured, config } = useSettings();
  const [status, setStatus] = useState<VoiceHelmStatus>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(90);
  const [latestReply, setLatestReply] = useState(lastAssistantReply);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize latest reply
  useEffect(() => {
    if (lastAssistantReply) {
      setLatestReply(lastAssistantReply);
    }
  }, [lastAssistantReply]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      handleStopAll();
    }
  }, [isOpen]);

  const handleStopAll = () => {
    speechEngine.stopListening();
    speechEngine.stopSpeaking();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setStatus('IDLE');
    setSecondsRemaining(90);
  };

  // Start 90-second countdown guardrail
  const startRecordingTimer = () => {
    setSecondsRemaining(90);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleFinishRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartRecording = () => {
    setErrorNotice(null);
    speechEngine.stopSpeaking();

    const started = speechEngine.startListening({
      onTranscript: (text, isFinal) => {
        setTranscript(text);
      },
      onError: (err) => {
        setErrorNotice(err);
        handleStopAll();
      },
      onEnd: () => {
        // If finished naturally without click
      },
    });

    if (started) {
      setStatus('LISTENING');
      startRecordingTimer();
    } else {
      setErrorNotice('Microphone access is unavailable or unsupported.');
    }
  };

  const handleFinishRecording = async () => {
    speechEngine.stopListening();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!transcript.trim()) {
      setStatus('IDLE');
      return;
    }

    setStatus('THINKING');
    try {
      let reply = '';
      if (onDispatchMessage) {
        reply = await onDispatchMessage(transcript.trim());
      } else {
        const apiKey = config?.apiKey?.trim() || getClientGeminiApiKey();
        if (apiKey) {
          const directRes = await generateContentClientDirect({
            apiKey,
            model: config?.model || 'gemini-2.5-flash',
            baseUrl: config?.baseUrl,
            prompt: transcript.trim(),
            systemInstruction: 'You are Luffy, Captain of Quarkmeme. Give a concise, energetic response (maximum 2 sentences).',
          });
          reply = directRes.text || "Aye aye! I hear you loud and clear. Let's set sail!";
        } else {
          reply = `Aye aye! I received your order: "${transcript.trim()}". Setting sail!`;
        }
      }

      setLatestReply(reply);
      setStatus('SPEAKING');
      if (!isMuted) {
        speechEngine.speakLuffy(reply, {
          onEnd: () => setStatus('IDLE'),
          onError: () => setStatus('IDLE'),
        });
      } else {
        setStatus('IDLE');
      }
    } catch (err) {
      console.error('Voice Helm AI generation error:', err);
      setStatus('IDLE');
    }
  };

  const handleInterrupt = () => {
    handleStopAll();
  };

  const handleReplayLatest = () => {
    if (!latestReply) return;
    setStatus('SPEAKING');
    speechEngine.speakLuffy(latestReply, {
      onEnd: () => setStatus('IDLE'),
      onError: () => setStatus('IDLE'),
    });
  };

  // Progress ring math (radius 22, circumference 138.2)
  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - secondsRemaining / 90);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-2xl mx-auto w-full bg-slate-950/95 border-t border-amber-500/30 rounded-t-3xl shadow-2xl backdrop-blur-2xl p-6 sm:p-7 pb-safe text-slate-100"
      >
        {/* Grab bar */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />

        {/* Header & Status Pill */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Crown width={20} height={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Speak with Luffy · your CEO
              </h2>
              <p className="text-xs text-slate-400">Zero-cost offline speech engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Status Pill */}
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5 ${
                status === 'LISTENING'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : status === 'THINKING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : status === 'SPEAKING'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-white/10'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === 'LISTENING'
                    ? 'bg-rose-400 animate-ping'
                    : status === 'SPEAKING'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span>{status}</span>
            </span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X width={18} height={18} />
            </button>
          </div>
        </div>

        {/* Error notification if mic unavailable */}
        {errorNotice && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle width={16} height={16} className="text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Unconfigured Key Notice */}
        {!isConfigured && (
          <div className="my-3 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle width={16} height={16} className="text-amber-400 shrink-0" />
              <span>Engine offline: Configure your API Key in Settings to speak with Luffy.</span>
            </div>
            <Link
              href="/settings"
              onClick={onClose}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
            >
              Settings
            </Link>
          </div>
        )}

        {/* Animated Waveform & Live Transcript Box */}
        <div className="my-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 min-h-[110px] flex flex-col justify-between relative overflow-hidden">
          {/* Animated audio wave bars when LISTENING */}
          {status === 'LISTENING' && (
            <div className="absolute inset-x-0 bottom-0 h-10 flex items-end justify-center gap-1.5 px-4 opacity-40 pointer-events-none">
              {[24, 40, 16, 32, 48, 20, 36, 44, 28, 16, 40, 24].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [12, h, 8, h * 0.8, 12] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.08 }}
                  className="w-1.5 bg-gradient-to-t from-amber-500 to-red-500 rounded-full"
                />
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono flex items-center justify-between mb-2">
            <span>Voice Buffer</span>
            {status === 'LISTENING' && (
              <span className="text-amber-300 text-[11px] font-bold">
                {secondsRemaining}s remaining
              </span>
            )}
          </div>

          <div className="text-sm text-white font-medium italic min-h-[44px]">
            {transcript ? (
              `"${transcript}"`
            ) : status === 'LISTENING' ? (
              <span className="text-slate-400 animate-pulse">Listening... speak your directive to Captain Luffy.</span>
            ) : (
              <span className="text-slate-500">Tap "Record microphone" to speak your order to Luffy.</span>
            )}
          </div>

          {/* Latest Captain's response box */}
          {latestReply && status !== 'LISTENING' && (
            <div className="mt-3 pt-3 border-t border-white/5 text-xs text-amber-200/90 font-sans">
              <span className="font-bold text-amber-400 block mb-0.5">Captain Luffy:</span>
              <p className="line-clamp-2 leading-relaxed">{latestReply}</p>
            </div>
          )}
        </div>

        {/* Touch Control Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* 90-second Recording Progress Ring + Record Button */}
          <div className="flex items-center gap-2">
            {status !== 'LISTENING' ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95 min-h-[44px]"
              >
                <Mic width={16} height={16} />
                <span>Record microphone</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* 90s Countdown Ring */}
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
                    <circle
                      cx="26"
                      cy="26"
                      r={ringRadius}
                      className="text-slate-800 stroke-current"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="26"
                      cy="26"
                      r={ringRadius}
                      className="text-amber-400 stroke-current transition-all duration-1000 ease-linear"
                      strokeWidth="3.5"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold text-amber-300">
                    {secondsRemaining}
                  </span>
                </div>

                <button
                  onClick={handleFinishRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/30 transition-all active:scale-95 min-h-[44px]"
                >
                  <Send width={16} height={16} />
                  <span>Finish recording</span>
                </button>
              </div>
            )}

            {/* Stop / Interrupt button */}
            <button
              onClick={handleInterrupt}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Stop / Interrupt"
            >
              <Square width={16} height={16} className="fill-current text-rose-400" />
            </button>
          </div>

          {/* Secondary Actions: Mute and Replay */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isMuted && speechEngine.isSpeaking()) {
                  speechEngine.stopSpeaking();
                }
                setIsMuted(!isMuted);
              }}
              className={`p-2.5 rounded-2xl border transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title={isMuted ? 'Unmute replies' : 'Mute replies (silent reading)'}
            >
              {isMuted ? <VolumeX width={16} height={16} /> : <Volume2 width={16} height={16} />}
            </button>

            <button
              onClick={handleReplayLatest}
              disabled={!latestReply || isMuted}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-xs text-slate-300 hover:text-white transition-all active:scale-95 min-h-[44px] flex items-center gap-1.5"
              title="Read Luffy's latest reply"
            >
              <RotateCcw width={14} height={14} className="text-amber-400" />
              <span className="hidden sm:inline">Read reply</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
