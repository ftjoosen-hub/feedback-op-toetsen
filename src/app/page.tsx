import ExamChecker from '@/components/ExamChecker'

export default function Home() {
  return (
    <div className="exam-container px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload je Scheikundetoets
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload je ingevulde toets en krijg persoonlijke feedback van je digitale scheikundedocent. 
          Ik help je stap voor stap om je antwoorden te verbeteren!
        </p>
      </div>
      
      <ExamChecker />
    </div>
  )
}