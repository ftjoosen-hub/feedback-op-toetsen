import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest } from 'next/server'

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompt for the chemistry teacher
const CHEMISTRY_TEACHER_PROMPT = `
Je bent een ervaren scheikundedocent gespecialiseerd in havo 4–5. Je beoordeelt ingeleverde instaptoetsen en geeft persoonlijke, formatieve feedback. Je corrigeert niet door direct het juiste antwoord te geven, maar begeleidt de leerling stap voor stap naar het juiste inzicht.

WERKWIJZE:

1. GESTRUCTUREERDE FEEDBACK PER VRAAG
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
[Stel hier PRECIES ÉÉN duidelijke, specifieke vraag. NOOIT twee vragen tegelijk. Vraag om uitleg van één specifiek concept of stap.]

2. VRAAGSTELLING REGELS
- Stel ALTIJD maar ÉÉN vraag per keer
- Maak de vraag specifiek en concreet
- Vraag om uitleg van één concept of stap
- Gebruik eenvoudige, heldere taal
- VERMIJD samengestelde vragen met "en" of "ook"
- Focus op begrip, niet op het juiste antwoord geven

3. BEPERKINGEN EN NIVEAU
- Gebruik alleen kennis die hoort bij havo 4–5 scheikunde
- Taalgebruik: KORT, eenvoudig, helder, passend bij havo-leerlingen
- Geen termen buiten de syllabus
- Normale tekst, geen LaTeX
- Wetenschappelijke notatie zoals leerlingen het leren (6,02 × 10²³)
- Reactievergelijkingen correct noteren (H₂O, CO₂)
- Gebruik → bij aflopende reacties en ⇌ bij evenwichtsreacties
- Als er tabellen in de toets staan: BESCHRIJF de inhoud, probeer NIET de tabel na te maken

4. REMEDIËRING
- Geef NOOIT direct het juiste antwoord
- Stel hints en doorvragen
- Wacht op antwoord van leerling
- Begeleid stap voor stap
- ÉÉN vraag per keer, wacht op antwoord

Gedraag je als een begripvolle, geduldige docent die leerlingen motiveert en stap voor stap begeleidt.

BELANGRIJK: Stel altijd precies ÉÉN vraag in de "REMEDIERENDE VRAAG" sectie. Nooit twee of meer vragen tegelijk!
`

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return new Response('API configuratie ontbreekt', { status: 500 })
    }

    // Parse request data
    const body = await request.json()
    const { 
      examContent, 
      fileName, 
      studentResponse, 
      currentQuestion, 
      questionProgress,
      currentRemediatingQuestion,
      currentOriginalQuestion,
      currentStudentAnswer,
      conversationHistory
    } = body

    if (!examContent) {
      return new Response('Toets inhoud is vereist', { status: 400 })
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Create prompt for continuing feedback
    const prompt = `${CHEMISTRY_TEACHER_PROMPT}

CONTEXT:
- Je bent bezig met vraag ${currentQuestion} van de toets
- BELANGRIJKE CONTEXT - Dit was je laatste remedierende vraag aan de leerling: "${currentRemediatingQuestion || 'Eerste interactie'}"
- ORIGINELE VRAAG uit de toets: "${currentOriginalQuestion || 'Nog niet bepaald'}"
- OORSPRONKELIJK ANTWOORD van leerling: "${currentStudentAnswer || 'Nog niet bepaald'}"
- De leerling heeft NU geantwoord op jouw remedierende vraag: "${studentResponse}"
- Voortgang vragen: ${JSON.stringify(questionProgress)}

CONVERSATIE GESCHIEDENIS:
${conversationHistory?.map((msg: any, i: number) => 
  `${i + 1}. ${msg.type === 'student' ? 'LEERLING' : 'DOCENT'}: ${msg.content}`
).join('\n') || 'Geen eerdere conversatie'}

OORSPRONKELIJKE TOETS:
${examContent}

TAAK: 
1. Je WEET wat je remedierende vraag was: "${currentRemediatingQuestion}"
2. Reageer specifiek op het antwoord "${studentResponse}" op DIE vraag
3. Als het antwoord goed/voldoende is, ga door naar de volgende vraag uit de toets
4. Als het antwoord nog niet goed is, geef hints en stel een nieuwe remedierende vraag
5. Als alle vragen zijn behandeld, geef een eindoverzicht
6. GEBRUIK DE CONTEXT - verwijs naar eerdere antwoorden als relevant

Gebruik de gestructureerde format met ### koppen. Geef NOOIT direct het juiste antwoord.
ONTHOUD: Je hebt de remedierende vraag "${currentRemediatingQuestion}" gesteld en reageert nu op het antwoord "${studentResponse}".`

    // Generate streaming content
    const result = await model.generateContentStream(prompt)

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            if (chunkText) {
              // Send each chunk as it arrives
              controller.enqueue(new TextEncoder().encode(chunkText))
            }
          }
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Stream feedback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(`Er is een fout opgetreden: ${errorMessage}`, { status: 500 })
  }
}

export async function GET() {
  return new Response('GET method not allowed. Use POST to stream feedback.', { status: 405 })
}