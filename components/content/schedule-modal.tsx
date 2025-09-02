"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Sparkles, X, RotateCcw } from "lucide-react";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: string) => void;
  postId?: string;
  postContent?: string;
  isLoading?: boolean;
  // New props for rescheduling
  isRescheduling?: boolean;
  originalDate?: string;
  originalTime?: string;
  aiSuggestedTimes?: string[];
  targetDate?: string;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  postId,
  postContent,
  isLoading,
  isRescheduling = false,
  originalDate,
  originalTime,
  aiSuggestedTimes = [],
  targetDate,
}: ScheduleModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Set initial values when modal opens
  useEffect(() => {
    if (isRescheduling && targetDate) {
      // Use the target date directly to avoid timezone issues
      setDate(targetDate);
      
      // Set first AI suggestion as default if available
      if (aiSuggestedTimes.length > 0) {
        setTime(aiSuggestedTimes[0]);
        setAiSuggestion(aiSuggestedTimes[0]);
      }
    }
  }, [isRescheduling, targetDate, aiSuggestedTimes]);

  const handleSchedule = () => {
    if (date && time) {
      const scheduledAt = `${date}T${time}:00`;
      onSchedule(scheduledAt);
      // Don't close modal here - let the parent handle it after successful save
    }
  };

  const quickTimes = ["09:00", "12:00", "18:00"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col relative border border-white/20 dark:border-gray-800/40"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 z-10"
        >
          <X size={20} />
        </button>

        {/* Header - Fixed */}
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-500 to-pink-500 text-white shadow-md">
            {isRescheduling ? <RotateCcw size={22} /> : <Clock size={22} />}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isRescheduling ? "Reschedule Post" : "Schedule Post"}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Post Preview */}
          {postContent && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Post Preview</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {postContent.length > 120 ? `${postContent.substring(0, 120)}...` : postContent}
              </p>
            </div>
          )}

          {/* Original Time Display (for rescheduling) */}
          {isRescheduling && originalTime && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">
                <RotateCcw size={14} className="inline mr-1" />
                Original Time
              </p>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {originalTime}
              </p>
              {originalDate && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {new Date(originalDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          )}

          {/* Date Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar size={16} /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/50 shadow-inner focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* Time Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={16} /> Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/50 shadow-inner focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          {/* AI Suggestions */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Sparkles size={16} className="text-violet-500" /> 
              {isRescheduling ? "AI Suggested Best Times" : "AI Smart Suggestions"}
            </label>
            
            {isRescheduling && aiSuggestedTimes.length > 0 ? (
              // Show AI suggested times for rescheduling
              <div className="grid grid-cols-2 gap-2 mb-2">
                {aiSuggestedTimes.map((suggestedTime, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTime(suggestedTime);
                      setAiSuggestion(suggestedTime);
                    }}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm shadow hover:scale-105 transition-transform text-center"
                  >
                    {suggestedTime}
                  </button>
                ))}
              </div>
            ) : (
              // Show quick times for new scheduling
              <div className="flex flex-wrap gap-2 mb-2">
                {aiSuggestion ? (
                  <button
                    onClick={() => setTime(aiSuggestion)}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm shadow hover:scale-105 transition-transform"
                  >
                    Best AI Time: {aiSuggestion}
                  </button>
                ) : (
                  quickTimes.map((qt) => (
                    <button
                      key={qt}
                      onClick={() => setTime(qt)}
                      className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-violet-500 hover:text-white transition"
                    >
                      {qt}
                    </button>
                  ))
                )}
              </div>
            )}
            
            {/* Placeholder note for integration */}
            {!isRescheduling && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                🔮 AI recommendation will appear here once connected.
              </p>
            )}
          </div>

          {/* Scheduled Preview */}
          {date && time && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-violet-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border border-violet-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                📅 {isRescheduling ? "Rescheduled" : "Scheduled"} for{" "}
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>{" "}
                at{" "}
                <span className="font-semibold text-pink-600 dark:text-pink-400">
                  {time}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={!date || !time || isLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />
                {isRescheduling ? "Rescheduling..." : "Scheduling..."}
              </>
            ) : (
              isRescheduling ? "Confirm Reschedule" : "Confirm Schedule"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
