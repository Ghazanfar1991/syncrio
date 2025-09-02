"use client"

import React from 'react'
import { UploadProgress, useUploadProgress } from './upload-progress'

export function UploadProgressProvider() {
  const { tasks, removeTask, clearAll } = useUploadProgress()

  return (
    <UploadProgress
      tasks={tasks}
      onDismiss={removeTask}
      onDismissAll={clearAll}
    />
  )
}
