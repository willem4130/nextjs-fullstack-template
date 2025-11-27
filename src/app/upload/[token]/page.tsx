'use client'

import { useState, useCallback, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react'
import { api } from '@/trpc/react'

export default function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Validate the token and get request details
  const { data: requestData, isLoading, isError } = api.projectEmails.getDocumentRequestByToken.useQuery(
    { token },
    { retry: false }
  )

  const uploadMutation = api.projectEmails.uploadDocument.useMutation({
    onSuccess: () => {
      setUploadSuccess(true)
      setIsUploading(false)
    },
    onError: (err) => {
      setError(err.message)
      setIsUploading(false)
    },
  })

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (file: File) => {
    setError(null)

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Bestand is te groot. Maximaal 10MB toegestaan.')
      return
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      setError('Ongeldig bestandstype. Toegestaan: PDF, DOC, DOCX, PNG, JPG')
      return
    }

    setFile(file)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    // Convert file to base64
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      uploadMutation.mutate({
        token,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileContent: base64 || '',
      })
    }
    reader.onerror = () => {
      setError('Fout bij het lezen van het bestand.')
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid/expired token
  if (isError || !requestData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Ongeldige of verlopen link</h2>
            <p className="text-muted-foreground">
              Deze upload link is ongeldig of verlopen. Neem contact op met je projectmanager voor een nieuwe link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already uploaded
  if (requestData.status === 'UPLOADED' || requestData.status === 'VERIFIED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Document al geupload</h2>
            <p className="text-muted-foreground">
              Je hebt al een document geupload voor dit verzoek. Neem contact op met je projectmanager als je het document wilt vervangen.
            </p>
            {requestData.documentName && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Geupload bestand:</p>
                <p className="font-medium">{requestData.documentName}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Upload success
  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Upload succesvol!</h2>
            <p className="text-muted-foreground">
              Je document is succesvol geupload. Je kunt dit venster nu sluiten.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main upload form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>
            Upload je {requestData.type === 'contract' ? 'getekende contract' : 'document'} voor {requestData.project?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Project:</span>
              <span className="font-medium">{requestData.project?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Naam:</span>
              <span className="font-medium">{requestData.user?.name}</span>
            </div>
            {requestData.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Beschrijving:</span>
                <span className="font-medium">{requestData.description}</span>
              </div>
            )}
          </div>

          {/* Upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            } ${file ? 'border-green-500 bg-green-50' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Ander bestand kiezen
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="mb-2">
                  Sleep je bestand hierheen of{' '}
                  <label className="text-primary cursor-pointer hover:underline">
                    klik om te selecteren
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                    />
                  </label>
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, DOC, DOCX, PNG of JPG (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Upload button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Document Uploaden
              </>
            )}
          </Button>

          {/* Alternative links */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Problemen met uploaden?{' '}
              <a href={`https://app.simplicate.com/projects/project/${requestData.project?.simplicateId}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Upload direct in Simplicate
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
