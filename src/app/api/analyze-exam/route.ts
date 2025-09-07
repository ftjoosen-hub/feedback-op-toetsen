import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompt for the chemistry teacher
const CHEMISTRY_TEACHER_PROMPT = `
Je bent een ervaren scheikundedocent gespecialiseerd in havo 4–5. Je beoordeelt ingeleverde instaptoetsen en geeft persoonlijke, formatieve feedback. Je corrigeert niet door direct het juiste antwoord te geven, maar begeleidt de leerling stap voor stap naar het juiste inzicht.

WERKWIJZE:

1. LEERDOELEN VOORAF
- Baseer de leerdoelen op de havo-syllabus
- Formuleer deze in leerlingtaal ("Ik kan…", "Ik begrijp…", "Ik kan toepassen…")

2. INDICATIECIJFER VOORAF
- Geef aan het begin een indicatiecijfer (0–10) gebaseerd op de antwoorden zoals ze zijn ingeleverd
- Dit cijfer is niet definitief, maar laat zien hoe de leerling zou scoren zonder remediëring

3. KORTE SAMENVATTING
- Benoem KORT wat goed ging en waar extra aandacht nodig is (max 3-4 zinnen)
- Gebruik een overzicht met symbolen: ✅ = goed, ⚠️ = verbetering nodig

4. GESTRUCTUREERDE FEEDBACK PER VRAAG
- Gebruik ALTIJD deze exacte structuur voor elke vraag:

### VRAAG:
[Citeer hier de originele vraag uit de toets]

### JOUW ANTWOORD:
[Toon hier het antwoord van de leerling]

### FEEDBACK:
[Beknopte feedback - max 2-3 korte zinnen of opsomming]
- Goed antwoord → compliment + waarom goed
- Onjuist antwoord → wat ging mis + hint
- Gebruik ✅ ⚠️ 💡 symbolen

### REMEDIERENDE VRAAG:
[Stel hier een duidelijke, specifieke vraag die de leerling helpt het juiste inzicht te krijgen]

5. BEPERKINGEN EN NIVEAU
- Gebruik alleen kennis die hoort bij havo 4–5 scheikunde
- Taalgebruik: KORT, eenvoudig, helder, passend bij havo-leerlingen
- Geen termen buiten de syllabus
- Normale tekst, geen LaTeX
- Wetenschappelijke notatie zoals leerlingen het leren (6,02 × 10²³)
- Reactievergelijkingen correct noteren (H₂O, CO₂)
- Gebruik → bij aflopende reacties en ⇌ bij evenwichtsreacties
- Als er tabellen in de toets staan: BESCHRIJF de inhoud, probeer NIET de tabel na te maken

6. AFSLUITING NA ALLE VRAGEN
- Indicatiecijfer na remediëring
- Leerdoelenoverzicht met scores (✅/⚠️) en tips (📘)
- Vervolgoefeningen

Gedraag je als een begripvolle, geduldige docent die leerlingen motiveert en stap voor stap begeleidt.
`

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return NextResponse.json(
        { 
          error: 'API configuratie ontbreekt. Check Environment Variables.',
          hint: 'Voeg GEMINI_API_KEY toe aan je environment variables'
        }, 
        { status: 500 }
      )
    }

    // Parse request data
    const body = await request.json()
    const { examContent, fileName, action, studentResponse, currentQuestion, questionProgress } = body

    if (!examContent) {
      return NextResponse.json(
        { error: 'Toets inhoud is vereist' },
        { status: 400 }
      )
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    let prompt = ''
    let result

    if (action === 'initial_analysis') {
      // Initial analysis of the exam
      prompt = `${CHEMISTRY_TEACHER_PROMPT}

TAAK: Analyseer deze ingeleverde scheikundetoets en geef de eerste feedback.

TOETS INHOUD:
${examContent}

BESTANDSNAAM: ${fileName}

Geef je antwoord in het volgende JSON formaat (gebruik de gestructureerde feedback format voor firstQuestionFeedback):
{
  "summary": "KORTE samenvatting met ✅ en ⚠️ symbolen (max 3-4 zinnen)",
  "initialGrade": 7.2,
  "learningObjectives": ["Ik kan...", "Ik begrijp...", "Ik kan toepassen..."],
  "totalQuestions": 5,
  "firstQuestionFeedback": "Gebruik de gestructureerde format: ### VRAAG: ... ### JOUW ANTWOORD: ... ### FEEDBACK: ... ### REMEDIERENDE VRAAG: ...",
  "questionProgress": {"1": "reviewing", "2": "pending", "3": "pending", "4": "pending", "5": "pending"}
}

Gebruik voor firstQuestionFeedback de exacte gestructureerde format met ### koppen. Geef NOOIT direct het juiste antwoord.`

      result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        
        const analysisData = JSON.parse(jsonMatch[0])
        
        return NextResponse.json({
          success: true,
          ...analysisData
        })
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return NextResponse.json(
          { error: 'Fout bij het verwerken van de analyse' },
          { status: 500 }
        )
      }

    } else if (action === 'continue_feedback') {
      // Continue the feedback conversation
      prompt = `${CHEMISTRY_TEACHER_PROMPT}

CONTEXT:
- Je bent bezig met vraag ${currentQuestion} van de toets
- De leerling heeft geantwoord: "${studentResponse}"
- Voortgang vragen: ${JSON.stringify(questionProgress)}

OORSPRONKELIJKE TOETS:
${examContent}

TAAK: 
1. Reageer op het antwoord van de leerling voor vraag ${currentQuestion}
2. Als het antwoord goed/voldoende is, ga door naar de volgende vraag
3. Als het antwoord nog niet goed is, geef hints en vraag door (geef NOOIT direct het antwoord)
4. Als alle vragen zijn behandeld, geef een eindoverzicht

Geef je antwoord in het volgende JSON formaat (gebruik gestructureerde format voor feedback):
{
  "feedback": "Gebruik de gestructureerde format: ### VRAAG: ... ### JOUW ANTWOORD: ... ### FEEDBACK: ... ### REMEDIERENDE VRAAG: ... (of eindoverzicht als complete)",
  "currentQuestion": 2,
  "isComplete": false,
  "finalGrade": 8.1,
  "questionProgress": {"1": "completed", "2": "reviewing", "3": "pending", "4": "pending", "5": "pending"}
}

Als alle vragen zijn afgerond, zet "isComplete": true en geef een eindoverzicht met het definitieve cijfer (geen gestructureerde format voor eindoverzicht).`

      result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        
        const feedbackData = JSON.parse(jsonMatch[0])
        
        return NextResponse.json({
          success: true,
          ...feedbackData
        })
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return NextResponse.json(
          { error: 'Fout bij het verwerken van de feedback' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Onbekende actie' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Exam analysis error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Er is een fout opgetreden bij het analyseren van de toets',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}