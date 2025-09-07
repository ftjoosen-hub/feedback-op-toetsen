'use client'

import { useState, useRef } from 'react'

interface FileUploadProps {
  onFileUpload: (file: File, content: string, fileType: string) => void
  isAnalyzing: boolean
}

export default function FileUpload({ onFileUpload, isAnalyzing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    setUploadError('')
    
    // Check file type
    const fileName = file.name.toLowerCase()
    const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
    const isPdf = fileName.endsWith('.pdf')
    const isDocx = fileName.endsWith('.docx')
    const isText = fileName.match(/\.(txt|md)$/i)
    
    if (!isImage && !isPdf && !isDocx && !isText) {
      setUploadError('Ondersteunde formaten: afbeeldingen (JPG, PNG), PDF, Word documenten (.docx), of tekstbestanden (.txt)')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Bestand is te groot. Maximum grootte is 10MB.')
      return
    }

    try {
      let content = ''
      let fileType = ''

      if (isImage) {
        // Handle images - convert to base64
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          onFileUpload(file, result, 'image')
        }
        reader.onerror = () => {
          setUploadError('Fout bij het lezen van de afbeelding')
        }
        reader.readAsDataURL(file)
        return
      }

      if (isText) {
        // Handle text files
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          onFileUpload(file, result, 'text')
        }
        reader.onerror = () => {
          setUploadError('Fout bij het lezen van het tekstbestand')
        }
        reader.readAsText(file, 'UTF-8')
        return
      }

      if (isPdf || isDocx) {
        // Handle PDF and DOCX via server
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const data = await response.json()
        onFileUpload(file, data.content, 'document')
      }
    } catch (error) {
      console.error('File upload error:', error)
      setUploadError('Fout bij uploaden: ' + (error instanceof Error ? error.message : 'Onbekende fout'))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Toets wordt geanalyseerd...
          </h3>
          <p className="text-gray-600 mb-4">
            Ik bekijk je antwoorden en bereid persoonlijke feedback voor
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sleep je toets hierheen
            </h3>
            <p className="text-gray-600 mb-4">
              of klik om een bestand te selecteren
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.bmp"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          
          <label
            htmlFor="file-input"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
          >
            Bestand Selecteren
          </label>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Ondersteunde formaten:
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
              <span className="bg-gray-100 px-2 py-1 rounded">📄 PDF (beperkt)</span>
              <span className="bg-gray-100 px-2 py-1 rounded">📝 Word (.docx)</span>
              <span className="bg-gray-100 px-2 py-1 rounded">📸 Afbeeldingen</span>
              <span className="bg-gray-100 px-2 py-1 rounded">📋 Tekst (.txt)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Maximum bestandsgrootte: 10MB
            </p>
            <p className="text-xs text-orange-500 mt-1">
              💡 Voor beste resultaten: gebruik Word (.docx) of maak foto's van je toets
            </p>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-red-800 font-medium">Upload fout</p>
              <p className="text-red-700 text-sm mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-600 text-xl">💡</span>
          </div>
          <div className="ml-3">
            <h4 className="text-blue-900 font-medium">Tips voor de beste feedback:</h4>
            <ul className="text-blue-800 text-sm mt-2 space-y-1">
              <li>• Zorg dat je antwoorden duidelijk leesbaar zijn</li>
              <li>• Upload de volledige toets voor complete feedback</li>
              <li>• Maak foto's met goede belichting (bij afbeeldingen)</li>
              <li>• Gebruik duidelijke vraagnummering</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}