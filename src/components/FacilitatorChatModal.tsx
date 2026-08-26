/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage, WorkshopStageId } from '../types';
import { STAGE_GUIDANCE } from '../data/defaultData';

interface FacilitatorChatModalProps {
  stageId: WorkshopStageId;
  messages: ChatMessage[];
  onSendMessage: (query: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export const FacilitatorChatModal: React.FC<FacilitatorChatModalProps> = ({
  stageId,
  messages,
  onSendMessage,
  onClose,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const guidance = STAGE_GUIDANCE[stageId] || STAGE_GUIDANCE[1];
  const isBoardMode = stageId === 5;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    await onSendMessage(query);
  };

  return (
    <div
      id="facilitator-chat-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full flex flex-col h-[580px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isBoardMode
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {isBoardMode ? <ShieldAlert className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-300">
                  {isBoardMode ? 'Board Challenger' : 'AI Workshop Facilitator'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  Stage {stageId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs">
                {guidance.role}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage protocol prompt banner */}
        <div className="px-4 py-2 bg-indigo-950/30 border-b border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          <span>
            {isBoardMode
              ? 'Board mode active: questions will be evaluated critically from an executive risk perspective.'
              : `Current Stage Protocol: ${guidance.whereYouAre}`}
          </span>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          {/* Initial welcome message if empty */}
          {messages.length === 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 leading-relaxed">
              <span className="font-bold text-indigo-300 block mb-1">
                Facilitator Note for Stage {stageId}:
              </span>
              <p className="mb-2">{guidance.whatYouShouldDo}</p>
              <p className="text-slate-400 italic">
                Ask me any questions about this stage's methodology, data requirements, or next steps.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                    isBoardMode
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isBoardMode ? <ShieldAlert className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
              )}

              <div
                className={`p-3 rounded-xl max-w-[82%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Facilitator is framing response according to stage protocol...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isBoardMode
                ? 'Ask the Board Challenger a question...'
                : 'Ask facilitator for guidance on this stage...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
