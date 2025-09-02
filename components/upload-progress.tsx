"use client"

import React, { useState, useEffect } from 'react'
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadTask {
  id: string
  type: 'video' | 'image'
  platform: string
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface UploadProgressProps {
  tasks: UploadTask[]
  onDismiss: (taskId: string) => void
  onDismissAll: () => void
}

export function UploadProgress({ tasks, onDismiss, onDismissAll }: UploadProgressProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(tasks.length > 0)
  }, [tasks])

  if (!isVisible || tasks.length === 0) return null

  const activeTasks = tasks.filter(task => task.status === 'uploading')
  const completedTasks = tasks.filter(task => task.status === 'success')
  const errorTasks = tasks.filter(task => task.status === 'error')

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">
              {activeTasks.length > 0 ? 'Uploading...' : 'Upload Complete'}
            </span>
          </div>
          <button
            onClick={onDismissAll}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task List */}
        <div className="max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {task.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  {task.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {task.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {task.platform}
                  </span>
                </div>
                <button
                  onClick={() => onDismiss(task.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                {task.fileName}
              </div>

              {task.status === 'uploading' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}

              {task.status === 'error' && task.error && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {task.error}
                </div>
              )}

              {task.status === 'success' && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Upload successful
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {(completedTasks.length > 0 || errorTasks.length > 0) && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 text-xs">
            {completedTasks.length > 0 && (
              <div className="text-green-600 dark:text-green-400">
                ✓ {completedTasks.length} completed
              </div>
            )}
            {errorTasks.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                ✗ {errorTasks.length} failed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Global upload progress manager
class UploadProgressManager {
  private tasks: UploadTask[] = []
  private listeners: ((tasks: UploadTask[]) => void)[] = []

  addTask(task: Omit<UploadTask, 'id'>) {
    const newTask: UploadTask = {
      ...task,
      id: Math.random().toString(36).substr(2, 9)
    }
    this.tasks.push(newTask)
    this.notifyListeners()
    return newTask.id
  }

  updateTask(id: string, updates: Partial<UploadTask>) {
    const taskIndex = this.tasks.findIndex(task => task.id === id)
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates }
      this.notifyListeners()
    }
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(task => task.id !== id)
    this.notifyListeners()
  }

  clearAll() {
    this.tasks = []
    this.notifyListeners()
  }

  subscribe(listener: (tasks: UploadTask[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.tasks]))
  }
}

export const uploadProgressManager = new UploadProgressManager()

// Hook to use upload progress
export function useUploadProgress() {
  const [tasks, setTasks] = useState<UploadTask[]>([])

  useEffect(() => {
    return uploadProgressManager.subscribe(setTasks)
  }, [])

  return {
    tasks,
    addTask: uploadProgressManager.addTask.bind(uploadProgressManager),
    updateTask: uploadProgressManager.updateTask.bind(uploadProgressManager),
    removeTask: uploadProgressManager.removeTask.bind(uploadProgressManager),
    clearAll: uploadProgressManager.clearAll.bind(uploadProgressManager)
  }
}
