'use client'

import { useState } from 'react'

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

interface FeedbackDisplayProps {
  feedbackData: FeedbackData
  onStartChat: () => void
  onReset: () => void
}

export default function FeedbackDisplay({ feedbackData, onStartChat, onReset }: FeedbackDisplayProps) {
  const [showObjectives, setShowObjectives] = useState(false)

  const getGradeColor = (grade: number) => {
    if (grade >= 8) return 'text-green-600 bg-green-100'
    if (grade >= 6.5) return 'text-blue-600 bg-blue-100'
    if (grade >= 5.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'reviewing': return 'bg-blue-500'
      default: return 'bg-gray-300'
    }
  }

  const formatFeedback = (feedback: string) => {
    // Simple formatting for better readability
    return feedback
      .split('\n')
      .map((line, index) => {
        if (line.trim().startsWith('✅')) {
          return <div key={index} className="flex items-start space-x-2 text-green-700 bg-green-50 p-2 rounded mb-2">
            <span>✅</span>
            <span>{line.replace('✅', '').trim()}</span>
          </div>
        }
        if (line.trim().startsWith('⚠️')) {
          return <div key={index} className="flex items-start space-x-2 text-orange-700 bg-orange-50 p-2 rounded mb-2">
            <span>⚠️</span>
            <span>{line.replace('⚠️', '').trim()}</span>
          </div>
        }
        if (line.trim().startsWith('💡')) {
          return <div key={index} className="flex items-start space-x-2 text-blue-700 bg-blue-50 p-2 rounded mb-2">
            <span>💡</span>
            <span>{line.replace('💡', '').trim()}</span>
          </div>
        }
        if (line.trim()) {
          return <p key={index} className="mb-2">{line}</p>
        }
        return <br key={index} />
      })
  }

  return (
    <div className="space-y-6">
      {/* Header with grade and progress */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {feedbackData.isComplete ? 'Toets Afgerond! 🎉' : 'Feedback op je Toets'}
          </h2>
          <button
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Nieuwe toets uploaden
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getGradeColor(feedbackData.initialGrade)}`}>
              {feedbackData.initialGrade.toFixed(1)}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {feedbackData.isComplete ? 'Eindcijfer' : 'Startcijfer'}
            </p>
          </div>

          {feedbackData.isComplete && feedbackData.finalGrade && (
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getGradeColor(feedbackData.finalGrade)}`}>
                {feedbackData.finalGrade.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600 mt-2">Na feedback</p>
            </div>
          )}

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-2xl font-bold text-gray-700">
              {Object.values(feedbackData.questionProgress).filter(status => status === 'completed').length}/{feedbackData.totalQuestions}
            </div>
            <p className="text-sm text-gray-600 mt-2">Vragen afgerond</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Voortgang</span>
            <span className="text-sm text-gray-500">
              {Math.round((Object.values(feedbackData.questionProgress).filter(status => status === 'completed').length / feedbackData.totalQuestions) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(Object.values(feedbackData.questionProgress).filter(status => status === 'completed').length / feedbackData.totalQuestions) * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Question progress indicators */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: feedbackData.totalQuestions }, (_, i) => i + 1).map(questionNum => {
            const status = feedbackData.questionProgress[questionNum] || 'pending'
            return (
              <div
                key={questionNum}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getProgressColor(status)}`}
                title={`Vraag ${questionNum}: ${status === 'completed' ? 'Afgerond' : status === 'reviewing' ? 'Bezig' : 'Wachtend'}`}
              >
                {questionNum}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Samenvatting</h3>
        <div className="prose prose-sm max-w-none">
          {formatFeedback(feedbackData.summary)}
        </div>
      </div>

      {/* Learning objectives */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowObjectives(!showObjectives)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">Leerdoelen</h3>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${showObjectives ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showObjectives && (
          <div className="mt-4 space-y-2">
            {feedbackData.learningObjectives.map((objective, index) => (
              <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                <span className="text-blue-600 font-medium">•</span>
                <span className="text-gray-700">{objective}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current feedback */}
      {!feedbackData.isComplete && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Klaar om te beginnen?
            </h3>
            <p className="text-gray-600 mb-6">
              We gaan nu vraag voor vraag door je toets heen. Je krijgt feedback en kunt je antwoorden verbeteren.
            </p>
            <button
              onClick={onStartChat}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-3 mx-auto"
            >
              <span className="text-xl">🚀</span>
              <span>Start met Vraag {feedbackData.currentQuestion}</span>
            </button>
          </div>
        </div>
      )}

      {feedbackData.isComplete && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <div className="success-animation inline-block mb-4">
              <span className="text-6xl">🎉</span>
            </div>
            <h3 className="text-2xl font-bold text-green-700 mb-2">
              Gefeliciteerd!
            </h3>
            <p className="text-lg text-gray-700 mb-2">
              Je hebt alle vragen doorgenomen en veel geleerd!
            </p>
            <p className="text-gray-600">
              Je cijfer is verbeterd van {feedbackData.initialGrade.toFixed(1)} naar {feedbackData.finalGrade?.toFixed(1)}
            </p>
            
            {/* Final feedback */}
            <div className="mt-6 bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="prose prose-sm max-w-none text-left">
                {formatFeedback(feedbackData.feedback)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}