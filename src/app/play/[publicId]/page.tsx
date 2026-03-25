'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ImageOff } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

// ---------- Types ----------

interface QuestionPayload {
  finished: boolean
  questionOrder: number
  totalQuestions: number
  question: {
    id: string
    number: number
    majorCategory: string
    mediumCategory: string
    minorCategory: string
    minorSummary?: string
    bannerInsight?: string
    imagePath: string
  }
}

interface QuestionData {
  finished: boolean
  questionId: string
  questionOrder: number
  totalQuestions: number
  imagePath: string
  categoryMedium: string
  categoryMinor: string
  bannerInsight?: string
}

interface AnswerResponse {
  success: boolean
  next: boolean
}

// ---------- Slide variants ----------

const slideVariants = {
  enter: { x: '100%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
}

// ---------- Component ----------

export default function PlayPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = use(params)
  const router = useRouter()

  const [question, setQuestion] = useState<QuestionData | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)
  const [imgExpanded, setImgExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ---- Fetch question ----

  const fetchQuestion = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/play/${publicId}/question`)
      if (!res.ok) {
        throw new Error('問題の取得に失敗しました')
      }
      const data: QuestionPayload = await res.json()

      if (data.finished) {
        router.replace(`/play/${publicId}/results`)
        return
      }

      setQuestion({
        finished: false,
        questionId: data.question.id,
        questionOrder: data.questionOrder,
        totalQuestions: data.totalQuestions,
        imagePath: data.question.imagePath,
        categoryMedium: data.question.mediumCategory,
        categoryMinor: data.question.minorCategory,
        bannerInsight: data.question.bannerInsight,
      })
      setAnswerText('')
      setImgError(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [publicId, router])

  useEffect(() => {
    fetchQuestion()
  }, [fetchQuestion])

  // ---- Auto-resize textarea ----

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [answerText])

  // ---- Submit answer ----

  const handleSubmit = async () => {
    if (!question || !answerText.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/play/${publicId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.questionId,
          answerText: answerText.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error('回答の送信に失敗しました')
      }

      const data: AnswerResponse = await res.json()

      if (!data.next) {
        // Last question — trigger evaluation, then redirect
        toast.info('回答を評価中です…')
        const evalRes = await fetch(`/api/play/${publicId}/evaluate`, {
          method: 'POST',
        })
        if (!evalRes.ok) {
          throw new Error('評価処理に失敗しました')
        }
        router.push(`/play/${publicId}/results`)
      } else {
        await fetchQuestion()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Loading state ----

  if (loading && !question) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-6">
        <p className="text-slate-400">問題を読み込めませんでした。</p>
      </div>
    )
  }

  const progressPercent =
    (question.questionOrder / question.totalQuestions) * 100
  const isLast = question.questionOrder + 1 >= question.totalQuestions

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-white">
      {/* ===== Top Bar ===== */}
      <header className="sticky top-0 z-30 bg-slate-950/90 px-4 pb-3 pt-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            問題{' '}
            <span className="text-cyan-400">{question.questionOrder + 1}</span>
            {' / '}
            {question.totalQuestions}
          </span>
        </div>
        <div className="mx-auto mt-2 max-w-lg">
          <Progress
            value={progressPercent}
            className="h-1.5 [&_[data-slot=progress-track]]:bg-slate-800 [&_[data-slot=progress-indicator]]:bg-cyan-400"
          />
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex flex-1 flex-col items-center px-4 pb-8 pt-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.questionOrder}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col gap-5"
            >
              {/* -- Banner Image -- */}
              <div
                className="relative aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-xl shadow-lg shadow-black/40"
                onClick={() => !imgError && setImgExpanded(true)}
              >
                {imgError ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-800">
                    <ImageOff className="size-10 text-slate-500" />
                    <span className="text-xs text-slate-500">
                      画像を読み込めませんでした
                    </span>
                  </div>
                ) : (
                  <Image
                    src={question.imagePath}
                    alt="バナー画像"
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 100vw, 512px"
                    onError={() => setImgError(true)}
                    priority
                  />
                )}
              </div>

              {/* -- Expanded Banner Overlay -- */}
              <AnimatePresence>
                {imgExpanded && (
                  <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setImgExpanded(false)}
                  >
                    <motion.div
                      className="relative max-h-[90vh] max-w-[95vw]"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={question.imagePath}
                        alt="バナー画像（拡大）"
                        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>


              {/* ===== Answer Section ===== */}
              <div className="flex flex-col gap-3 pt-2">
                <p className="text-sm font-semibold text-slate-100">
                  このバナーのDEI的な問題点を見つけてください
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-2.5">
                    <p className="text-[10px] font-medium text-cyan-400">10点</p>
                    <p className="mt-0.5 text-xs text-slate-300">指摘のポイント</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500">問題点を的確に捉えているか</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-2.5">
                    <p className="text-[10px] font-medium text-cyan-400">10点</p>
                    <p className="mt-0.5 text-xs text-slate-300">正確さ</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500">指摘内容が正確であるか</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-2.5">
                    <p className="text-[10px] font-medium text-cyan-400">10点</p>
                    <p className="mt-0.5 text-xs text-slate-300">改善アイデア</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500">建設的な改善提案があるか</p>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="回答を入力してください…"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    disabled={submitting}
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs tabular-nums text-slate-500">
                    {answerText.length}
                  </span>
                </div>

                <Button
                  size="lg"
                  disabled={!answerText.trim() || submitting}
                  onClick={handleSubmit}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      送信中…
                    </>
                  ) : isLast ? (
                    '最後の回答を送信'
                  ) : (
                    '回答を送信'
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
