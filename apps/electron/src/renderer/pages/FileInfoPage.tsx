import * as React from 'react'
import { useMemo, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ExternalLink, Eye, FolderOpen, Paperclip, RefreshCw } from 'lucide-react'
import { Markdown, ShikiCodeViewer, Spinner, classifyFile } from '@craft-agent/ui'
import { Panel } from '@/components/app-shell/Panel'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderIconButton } from '@/components/ui/HeaderIconButton'
import { useTheme } from '@/context/ThemeContext'
import { useNavigation, routes } from '@/contexts/NavigationContext'
import { insertPathsToSession } from '@/components/app-shell/input/insert-paths-to-session'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface FileInfoPageProps {
  filePath: string | null
  targetSessionId?: string | null
}

function getBaseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] || path
}

function formatDisplayPath(path: string): string {
  const homeMatch = path.match(/^\/Users\/[^/]+\/(.+)$/)
  if (homeMatch) return `~/${homeMatch[1]}`
  return path
}

export default function FileInfoPage({ filePath, targetSessionId }: FileInfoPageProps) {
  const { resolvedMode } = useTheme()
  const { navigate, navigateToSession } = useNavigation()
  const themeMode = resolvedMode === 'dark' ? 'dark' : 'light'
  const [refreshToken, setRefreshToken] = useState(0)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const classification = useMemo(
    () => (filePath ? classifyFile(filePath) : { type: null, canPreview: false }),
    [filePath]
  )

  React.useEffect(() => {
    setPdfPageCount(0)

    if (!filePath) {
      setTextContent(null)
      setImageUrl(null)
      setPdfData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setTextContent(null)
      setImageUrl(null)
      setPdfData(null)

      try {
        switch (classification.type) {
          case 'image': {
            const dataUrl = await window.electronAPI.readFileDataUrl(filePath)
            if (!cancelled) setImageUrl(dataUrl)
            break
          }
          case 'pdf': {
            const binary = await window.electronAPI.readFileBinary(filePath)
            if (!cancelled) setPdfData(binary)
            break
          }
          case 'markdown':
          case 'json':
          case 'code':
          case 'text': {
            const content = await window.electronAPI.readFile(filePath)
            if (!cancelled) setTextContent(content)
            break
          }
          default:
            break
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load file')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [classification.type, filePath, refreshToken])

  const parsedJsonText = useMemo(() => {
    if (classification.type !== 'json' || textContent === null) return textContent
    try {
      return JSON.stringify(JSON.parse(textContent), null, 2)
    } catch {
      return textContent
    }
  }, [classification.type, textContent])

  const pdfFile = useMemo(() => (
    pdfData ? { data: pdfData } : null
  ), [pdfData])

  const headerActions = filePath ? (
    <div className="flex items-center gap-1">
      <HeaderIconButton
        icon={<RefreshCw className="h-4 w-4" />}
        tooltip="Refresh preview"
        onClick={() => setRefreshToken((value) => value + 1)}
      />
      <HeaderIconButton
        icon={<Paperclip className="h-4 w-4" />}
        tooltip={targetSessionId ? 'Insert path into current session' : 'Open a session to insert this file path'}
        disabled={!filePath || !targetSessionId}
        onClick={() => {
          if (!filePath) return
          insertPathsToSession({
            sessionId: targetSessionId,
            paths: [filePath],
            navigateToSession,
          })
        }}
      />
      <HeaderIconButton
        icon={<FolderOpen className="h-4 w-4" />}
        tooltip="Reveal in folder"
        onClick={() => void window.electronAPI.showInFolder(filePath)}
      />
      <HeaderIconButton
        icon={<ExternalLink className="h-4 w-4" />}
        tooltip="Open externally"
        onClick={() => void window.electronAPI.openFile(filePath)}
      />
    </div>
  ) : undefined

  const renderEmptyState = (title: string, description: string) => (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Eye className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  )

  const renderContent = () => {
    if (!filePath) {
      return renderEmptyState('No file selected', 'Choose a file from the project tree to preview it here.')
    }

    if (isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner className="text-base" />
          Loading preview...
        </div>
      )
    }

    if (error) {
      return renderEmptyState('Preview failed', error)
    }

    if (!classification.canPreview) {
      return renderEmptyState('Preview not supported', 'This file type is available through external open for now.')
    }

    switch (classification.type) {
      case 'image':
        return (
          <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/20 p-6">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={getBaseName(filePath)}
                className="max-w-full rounded-xl border border-border/40 bg-background shadow-middle"
              />
            ) : null}
          </div>
        )
      case 'markdown':
        return (
          <div className="flex-1 overflow-auto px-8 py-6">
            <div className="mx-auto max-w-4xl rounded-2xl border border-border/30 bg-background p-8 shadow-minimal">
              <Markdown
                mode="minimal"
                onUrlClick={(url) => void window.electronAPI.openUrl(url)}
                onFileClick={(path) => {
                  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) {
                    navigate(routes.view.files(path))
                    return
                  }
                  void window.electronAPI.openFile(path)
                }}
                hideFirstMermaidExpand={false}
              >
                {textContent || ''}
              </Markdown>
            </div>
          </div>
        )
      case 'pdf':
        return (
          <div className="flex-1 overflow-auto px-4 py-4">
            {pdfData ? (
              <div className="flex flex-col items-center gap-4">
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
                  onLoadError={(loadError) => setError(`Failed to render PDF: ${loadError.message}`)}
                  loading={<div className="text-sm text-muted-foreground">Rendering PDF...</div>}
                >
                  {Array.from({ length: pdfPageCount }, (_, index) => (
                    <Page
                      key={index + 1}
                      pageNumber={index + 1}
                      renderTextLayer
                      renderAnnotationLayer
                      className="pdf-page"
                    />
                  ))}
                </Document>
              </div>
            ) : null}
          </div>
        )
      case 'json':
      case 'code':
      case 'text':
        return (
          <div className="flex-1 overflow-hidden">
            <ShikiCodeViewer
              code={parsedJsonText || ''}
              filePath={filePath}
              language={classification.type === 'text' ? 'text' : undefined}
              theme={themeMode}
            />
          </div>
        )
      default:
        return renderEmptyState('Preview not supported', 'This file type is available through external open for now.')
    }
  }

  return (
    <Panel variant="grow">
      <PanelHeader title={filePath ? getBaseName(filePath) : 'Project Files'} actions={headerActions} />
      {filePath && (
        <div className="border-b border-border/30 px-4 py-2 text-xs text-muted-foreground" title={filePath}>
          {formatDisplayPath(filePath)}
        </div>
      )}
      {renderContent()}
    </Panel>
  )
}
