'use client'

import { useState, useRef, useEffect } from 'react'

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

interface ChatInterfaceProps {
  feedbackData: FeedbackData
  onSendMessage: (message: string) => void
  onBackToFeedback: () => void
}

interface ChatMessage {
  id: string
  type: 'teacher' | 'student'
  content: string
  timestamp: Date
}

export default function ChatInterface({ feedbackData, onSendMessage, onBackToFeedback }: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize chat with teacher's feedback
  useEffect(() => {
    setChatHistory([{
      id: '1',
      type: 'teacher',
      content: feedbackData.feedback,
      timestamp: new Date()
    }])
  }, [feedbackData.feedback])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    const studentMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'student',
      content: message.trim(),
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, studentMessage])
    setMessage('')
    setIsLoading(true)

    try {
      await onSendMessage(studentMessage.content)
      // The parent component will handle updating the feedback
      // We'll add the teacher's response when the component re-renders
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'teacher',
        content: 'Sorry, er is een fout opgetreden. Probeer je antwoord opnieuw te sturen.',
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessage = (content: string) => {
    return content
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          <button
            onClick={onBackToFeedback}
            className="text-blue-100 hover:text-white text-sm underline"
          >
            Terug naar overzicht
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.type === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.type === 'teacher' ? (
                <div className="prose prose-sm max-w-none">
                  {formatMessage(msg.content)}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`text-xs mt-1 ${
                msg.type === 'student' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {msg.timestamp.toLocaleTimeString('nl-NL', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">Docent denkt na...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Typ je antwoord hier... (Enter om te versturen, Shift+Enter voor nieuwe regel)"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>💡 Tip: Probeer je antwoord stap voor stap uit te leggen</span>
          <span>{message.length}/500</span>
        </div>
      </div>
    </div>
  )
}