import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { capacitacionesApi } from '@/api/capacitaciones'
import type {
  ExamenPublico,
  EnviarRespuestasInput,
  ResultadoExamen,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

const DURACION_SEG = 20 * 60 // 20 minutos

type Phase = 'confirm' | 'examen' | 'enviado'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ExamenPublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(DURACION_SEG)
  const [examenData, setExamenData] = useState<ExamenPublico | null>(null)
  const [resultado, setResultado] = useState<ResultadoExamen | null>(null)

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['examen', token],
    queryFn: () => capacitacionesApi.getExamenPublico(token!),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (data) setExamenData(data)
  }, [data])

  // Countdown timer — only active during 'examen' phase
  useEffect(() => {
    if (phase !== 'examen') return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const mutation = useMutation({
    mutationFn: (input: EnviarRespuestasInput) =>
      capacitacionesApi.enviarExamen(token!, input),
    onSuccess: (res) => {
      setResultado(res)
      setPhase('enviado')
    },
  })

  function handleSubmit() {
    if (!examenData) return
    const input: EnviarRespuestasInput = {
      respuestas: examenData.preguntas.map(p => ({
        idPregunta: p.idPregunta,
        idRespuesta: selected[p.idPregunta] ?? null,
      })),
    }
    mutation.mutate(input)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        {phase === 'confirm' && (
          <>
            <CardHeader>
              <CardTitle>Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-40" />
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    El enlace de examen es inválido o ha expirado. Por favor solicita un nuevo enlace.
                  </AlertDescription>
                </Alert>
              )}
              {examenData && !error && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold">{examenData.nombre ?? 'Evaluación'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {examenData.preguntas.length} pregunta{examenData.preguntas.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tiempo disponible: {formatTime(DURACION_SEG)}
                    </p>
                  </div>
                  <Button onClick={() => { setPhase('examen') }}>
                    Comenzar examen
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}

        {phase === 'examen' && examenData && (
          <>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{examenData.nombre ?? 'Evaluación'}</CardTitle>
              <span className={`text-sm font-mono font-semibold ${timeLeft < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {examenData.preguntas.map((pregunta, idx) => (
                  <div key={pregunta.idPregunta} className="space-y-2">
                    <p className="font-medium">
                      {idx + 1}. {pregunta.pregunta}
                      {pregunta.puntos != null && (
                        <span className="ml-2 text-xs text-muted-foreground">({pregunta.puntos} pts)</span>
                      )}
                    </p>
                    <div className="space-y-1 pl-2">
                      {pregunta.opciones.map(opcion => (
                        <label
                          key={opcion.idRespuesta}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name={`pregunta-${pregunta.idPregunta}`}
                            value={opcion.idRespuesta}
                            checked={selected[pregunta.idPregunta] === opcion.idRespuesta}
                            onChange={() =>
                              setSelected(prev => ({
                                ...prev,
                                [pregunta.idPregunta]: opcion.idRespuesta,
                              }))
                            }
                            className="accent-primary"
                          />
                          {opcion.respuesta}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Enviando…' : 'Enviar respuestas'}
                </Button>
              </div>
              {mutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error al enviar las respuestas. Intenta de nuevo.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </>
        )}

        {phase === 'enviado' && resultado && (
          <>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-center">
                <p className="text-4xl font-bold">{resultado.puntaje}%</p>
                <Badge variant={resultado.aprobado ? 'success' : 'destructive'} className="text-sm px-4 py-1">
                  {resultado.estado}
                </Badge>
                <p className="text-muted-foreground">
                  {resultado.aprobado
                    ? '¡Felicidades! Has aprobado el examen.'
                    : 'No alcanzaste el puntaje mínimo. Consulta con tu supervisor.'}
                </p>
                <p className="text-sm text-muted-foreground">Puedes cerrar esta pestaña.</p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
