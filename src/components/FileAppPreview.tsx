import { Download } from 'lucide-react'
import { Markdown } from './Markdown'
import type { FileAppPreview as FileAppPreviewData } from '../types'

export function FileAppPreview({ data }: { data: FileAppPreviewData }) {
  const download = () => {
    const blobUrl = URL.createObjectURL(new Blob([data.content], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = data.name
    link.click()
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <div className="kb-file-preview">
      <div className="kb-file-bar">
        <div className="kb-file-ident">
          <strong>{data.name}</strong>
          <span>{data.format}</span>
        </div>
        <button type="button" className="kb-file-download" onClick={download}>
          <Download size={15} />
          <span>下载</span>
        </button>
      </div>
      <div className="kb-file-doc">
        <Markdown text={data.content} />
      </div>
    </div>
  )
}
