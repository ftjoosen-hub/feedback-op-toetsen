'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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
  currentRemediatingQuestion?: string
  currentOriginalQuestion?: string
  currentStudentAnswer?: string
}

interface ExamData {
  content: string
  fileName: string
  fileType: string
}

interface ChatInterfaceProps {
  feedbackData: FeedbackData
  examData: ExamData | null
  onUpdateFeedback: (feedbackData: FeedbackData) => void
  onBackToFeedback: () => void
}

interface ParsedFeedback {
  question: string
  studentAnswer: string
  feedback: string
  remediatingQuestion: string
  isStructured: boolean
}

export default function ChatInterface({ feedbackData, examData, onUpdateFeedback, onBackToFeedback }: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'student' | 'teacher'
    content: string
    timestamp: Date
  }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedbackData, streamedContent, isStreaming, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  // Parse structured feedback
  const parseFeedback = useCallback((feedbackText: string): ParsedFeedback => {
    const questionMatch = feedbackText.match(/### VRAAG:\s*([\s\S]*?)(?=### JOUW ANTWOORD:|$)/i)
    const answerMatch = feedbackText.match(/### JOUW ANTWOORD:\s*([\s\S]*?)(?=### FEEDBACK:|$)/i)
    const feedbackMatch = feedbackText.match(/### FEEDBACK:\s*([\s\S]*?)(?=### REMEDIERENDE VRAAG:|$)/i)
    const remediatingMatch = feedbackText.match(/### REMEDIERENDE VRAAG:\s*([\s\S]*?)$/i)

    if (questionMatch && answerMatch && feedbackMatch && remediatingMatch) {
      return {
        question: questionMatch[1].trim(),
        studentAnswer: answerMatch[1].trim(),
        feedback: feedbackMatch[1].trim(),
        remediatingQuestion: remediatingMatch[1].trim(),
        isStructured: true
      }
    }

    return {
      question: '',
      studentAnswer: '',
      feedback: feedbackText,
      remediatingQuestion: '',
      isStructured: false
    }
  }, [])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || isStreaming || !examData) return

    // Add student message to conversation history
    const studentMessage = {
      type: 'student' as const,
      content: message.trim(),
      timestamp: new Date()
    }
    setConversationHistory(prev => [...prev, studentMessage])

    setMessage('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamedContent('')

    try {
      const response = await fetch('/api/stream-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examContent: examData.content,
          fileName: examData.fileName,
          studentResponse: message.trim(),
          currentQuestion: feedbackData.currentQuestion,
          questionProgress: feedbackData.questionProgress,
          currentRemediatingQuestion: feedbackData.currentRemediatingQuestion,
          currentOriginalQuestion: feedbackData.currentOriginalQuestion,
          currentStudentAnswer: feedbackData.currentStudentAnswer,
          conversationHistory: conversationHistory
        }),
      })

      if (!response.ok) {
        throw new Error('Fout bij het verwerken van je antwoord')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Geen response stream beschikbaar')
      }

      let accumulatedContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
        
        const chunk = new TextDecoder().decode(value)
        accumulatedContent += chunk
        setStreamedContent(accumulatedContent)
      }

      // Add teacher response to conversation history
      const teacherMessage = {
        type: 'teacher' as const,
        content: accumulatedContent,
        timestamp: new Date()
      }
      setConversationHistory(prev => [...prev, teacherMessage])

      // Process the complete response to update feedback data
      const parsedResponse = parseFeedback(accumulatedContent)
      
      const isComplete = accumulatedContent.toLowerCase().includes('eindoverzicht') || 
                        accumulatedContent.toLowerCase().includes('alle vragen') ||
                        accumulatedContent.toLowerCase().includes('gefeliciteerd')
      
      const nextQuestion = isComplete ? feedbackData.currentQuestion : feedbackData.currentQuestion + 1
      
      // Update question progress
      const updatedProgress = { ...feedbackData.questionProgress }
      if (!isComplete) {
        updatedProgress[feedbackData.currentQuestion] = 'completed'
        if (nextQuestion <= feedbackData.totalQuestions) {
          updatedProgress[nextQuestion] = 'reviewing'
        }
      }
      
      const updatedFeedbackData: FeedbackData = {
        ...feedbackData,
        feedback: accumulatedContent,
        currentQuestion: nextQuestion,
        isComplete,
        finalGrade: isComplete ? Math.min(10, feedbackData.initialGrade + 1.5) : feedbackData.finalGrade,
        questionProgress: updatedProgress,
        currentRemediatingQuestion: parsedResponse.remediatingQuestion,
        currentOriginalQuestion: parsedResponse.question,
        currentStudentAnswer: parsedResponse.studentAnswer
      }
      
      onUpdateFeedback(updatedFeedbackData)
      
    } catch (error) {
      console.error('Error sending message:', error)
      setStreamedContent('Er is een fout opgetreden bij het verwerken van je antwoord. Probeer het opnieuw.')
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Handle structured feedback sections
        if (line.trim().startsWith('### VRAAG:')) {
          return <h4 key={index} className="font-semibold text-blue-900 mt-4 mb-2 flex items-center">
            <span className="text-lg mr-2">📝</span>
            {line.replace('### VRAAG:', '').trim()}
          </h4>
        }
        if (line.trim().startsWith('### JOUW ANTWOORD:')) {
          return <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2 flex items-center">
            <span className="text-lg mr-2">✏️</span>
            Jouw Antwoord
          </h4>
        }
        if (line.trim().startsWith('### FEEDBACK:')) {
          return <h4 key={index} className="font-semibold text-green-900 mt-4 mb-2 flex items-center">
            <span className="text-lg mr-2">💬</span>
            Feedback
          </h4>
        }
        if (line.trim().startsWith('### REMEDIERENDE VRAAG:')) {
          return <h4 key={index} className="font-semibold text-yellow-900 mt-4 mb-2 flex items-center">
            <span className="text-lg mr-2">❓</span>
            Vraag voor Jou
          </h4>
        }
        
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
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return <div key={index} className="flex items-start space-x-2 mb-1">
            <span className="text-blue-600 font-bold">•</span>
            <span>{line.replace(/^[•\-]\s*/, '').trim()}</span>
          </div>
        }
        if (line.trim()) {
          return <p key={index} className="mb-2">{line}</p>
        }
        return <br key={index} />
      })
  }

  // Use streamed content if available, otherwise use feedback data
  const contentToDisplay = isStreaming && streamedContent ? streamedContent : feedbackData.feedback
  const parsedFeedback = parseFeedback(contentToDisplay)
  
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xl">👨‍🏫</span>
            </div>
            <div>
              <h3 className="font-semibold">Je Scheikundedocent</h3>
              <p className="text-blue-100 text-sm">
                Vraag {feedbackData.currentQuestion} van {feedbackData.totalQuestions}
              </p>
            </div>
          </div>
          
          {/* Progress indicators */}
          <div className="flex items-center space-x-2 mx-4">
            {Array.from({ length: feedbackData.totalQuestions }, (_, i) => i + 1).map(questionNum => {
              const status = feedbackData.questionProgress[questionNum] || 'pending'
              const getProgressColor = (status: string) => {
                switch (status) {
                  case 'completed': return 'bg-green-400'
                  case 'reviewing': return 'bg-yellow-400'
                  default: return 'bg-blue-300'
                }
              }
              return (
                <div
                  key={questionNum}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getProgressColor(status)}`}
                  title={`Vraag ${questionNum}: ${status === 'completed' ? 'Afgerond' : status === 'reviewing' ? 'Bezig' : 'Wachtend'}`}
                >
                  {questionNum}
                </div>
              )
            })}
          </div>
          
          <button
            onClick={onBackToFeedback}
            className="text-blue-100 hover:text-white text-sm underline"
          >
            Terug naar overzicht
          </button>
        </div>
      </div>

      {/* Structured feedback content */}
      <div className="max-h-[calc(100vh-300px)] min-h-[500px] overflow-y-auto p-4 space-y-4">

        {parsedFeedback.isStructured ? (
          <>
            {/* Original Question */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <span className="text-lg mr-2">📝</span>
                Originele Vraag
              </h4>
              <div className="text-blue-800">
                {formatContent(parsedFeedback.question)}
              </div>
            </div>

            {/* Student's Answer */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="text-lg mr-2">✏️</span>
                Jouw Antwoord
              </h4>
              <div className="text-gray-800 font-mono bg-white p-3 rounded border">
                {formatContent(parsedFeedback.studentAnswer)}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="text-lg mr-2">💬</span>
                Feedback van je Docent
              </h4>
              <div className="text-gray-800">
                {formatContent(parsedFeedback.feedback)}
              </div>
            </div>

            {/* Remediating Question */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <span className="text-lg mr-2">❓</span>
                Vraag voor Jou
              </h4>
              <div className="text-yellow-800 font-medium">
                {formatContent(parsedFeedback.remediatingQuestion)}
              </div>
            </div>
          </>
        ) : (
          // Fallback for unstructured feedback or streaming content
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
              <span className="text-lg mr-2">💬</span>
              {isStreaming ? 'Docent schrijft feedback...' : 'Feedback van je Docent'}
            </h4>
            <div className="text-gray-800">
              {formatContent(contentToDisplay)}
            </div>
          </div>
        )}

        {/* Show streaming indicator at the bottom */}
        {isStreaming && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-blue-800 font-medium">Docent denkt na en schrijft feedback...</span>
            </div>
          </div>
        )}

        {isLoading && !isStreaming && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-blue-800 font-medium">Docent bekijkt je antwoord...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💭 Jouw Antwoord op de Remedierende Vraag:
          </label>
        </div>
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Denk na over de vraag hierboven en typ je antwoord hier... (Enter om te versturen)"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading || isStreaming}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading || isStreaming}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>💡 Tip: Leg je denkproces stap voor stap uit</span>
          <span>{message.length}/500</span>
        </div>
      </div>
    </div>
  )
}