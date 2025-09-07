'use client'

import { useState, useRef } from 'react'
import FileUpload from './FileUpload'
import FeedbackDisplay from './FeedbackDisplay'
import ChatInterface from './ChatInterface'

interface ExamData {
  content: string
  fileName: string
  fileType: string
}

interface FeedbackData {
  summary: string
  initialGrade: number
  learningObjectives: string[]
  currentQuestion: number
  totalQuestions: number
  feedback: string
  isComplete: boolean
  finalGrade?: number
  questionProgress: { [key: number]: 'pending' | 'reviewing' | 'completed' }
}

export default function ExamChecker() {
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'upload' | 'feedback' | 'chat'>('upload')
  const [error, setError] = useState<string>('')

  const handleFileUpload = async (file: File, content: string, fileType: string) => {
    setError('')
    setIsAnalyzing(true)
    
    try {
      const examData: ExamData = {
        content,
        fileName: file.name,
        fileType
      }
      
      setExamData(examData)
      
      // Start initial analysis
      const response = await fetch('/api/analyze-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examContent: content,
          fileName: file.name,
          action: 'initial_analysis'
        }),
      })

      if (!response.ok) {
        throw new Error('Fout bij het analyseren van de toets')
      }

      const data = await response.json()
      
      setFeedbackData({
        summary: data.summary,
        initialGrade: data.initialGrade,
        learningObjectives: data.learningObjectives,
        currentQuestion: 1,
        totalQuestions: data.totalQuestions,
        feedback: data.firstQuestionFeedback,
        isComplete: false,
        questionProgress: data.questionProgress || {}
      })
      
      setCurrentStep('feedback')
    } catch (error) {
      console.error('Analysis error:', error)
      setError('Er is een fout opgetreden bij het analyseren van je toets. Probeer het opnieuw.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleChatMessage = async (message: string) => {
    if (!examData || !feedbackData) return

    try {
      const response = await fetch('/api/analyze-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examContent: examData.content,
          fileName: examData.fileName,
          action: 'continue_feedback',
          studentResponse: message,
          currentQuestion: feedbackData.currentQuestion,
          questionProgress: feedbackData.questionProgress
        }),
      })

      if (!response.ok) {
        throw new Error('Fout bij het verwerken van je antwoord')
      }

      const data = await response.json()
      
      setFeedbackData(prev => prev ? {
        ...prev,
        currentQuestion: data.currentQuestion,
        feedback: data.feedback,
        isComplete: data.isComplete,
        finalGrade: data.finalGrade,
        questionProgress: data.questionProgress || prev.questionProgress
      } : null)

      if (data.isComplete) {
        setCurrentStep('feedback')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setError('Er is een fout opgetreden bij het verwerken van je antwoord.')
    }
  }

  const resetExam = () => {
    setExamData(null)
    setFeedbackData(null)
    setCurrentStep('upload')
    setError('')
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-red-800 font-medium">Oeps, er ging iets mis!</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'upload' && (
        <FileUpload 
          onFileUpload={handleFileUpload}
          isAnalyzing={isAnalyzing}
        />
      )}

      {currentStep === 'feedback' && feedbackData && (
        <FeedbackDisplay 
          feedbackData={feedbackData}
          onStartChat={() => setCurrentStep('chat')}
          onReset={resetExam}
        />
      )}

      {currentStep === 'chat' && feedbackData && !feedbackData.isComplete && (
        <ChatInterface 
          feedbackData={feedbackData}
          onSendMessage={handleChatMessage}
          onBackToFeedback={() => setCurrentStep('feedback')}
        />
      )}
    </div>
  )
}