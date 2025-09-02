// Twitter OAuth 1.0a implementation for media uploads
import crypto from 'crypto'

export interface TwitterOAuth1Config {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
}

export function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  config: TwitterOAuth1Config
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  
  // Add OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: config.accessToken,
    oauth_version: '1.0'
  }
  
  // Combine all parameters
  const allParams = { ...params, ...oauthParams }
  
  // Sort parameters alphabetically
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(key => `${key}=${encodeURIComponent(allParams[key])}`)
    .join('&')
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&')
  
  // Create signing key
  const signingKey = [
    encodeURIComponent(config.consumerSecret),
    encodeURIComponent(config.accessTokenSecret)
  ].join('&')
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64')
  
  return signature
}

export function createOAuth1Header(
  consumerKey: string,
  accessToken: string,
  signature: string,
  timestamp: string,
  nonce: string
): string {
  const authParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_signature: signature,
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0'
  }
  
  const authHeader = 'OAuth ' + Object.entries(authParams)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(', ')
  
  return authHeader
}

export function createTwitterMediaUploadRequest(
  imageBuffer: Buffer,
  mimeType: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): { body: any; headers: Record<string, string> } {
  const url = 'https://upload.twitter.com/1.1/media/upload.json'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  
  // Create multipart form data manually for Node.js
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex')
  const extension = mimeType.split('/')[1] || 'jpg'
  const filename = `image.${extension}`
  
  // Build multipart form data
  const formData = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="media"; filename="${filename}"`,
    `Content-Type: ${mimeType}`,
    '',
    imageBuffer.toString('base64'),
    `--${boundary}--`
  ].join('\r\n')
  
  // Generate OAuth signature
  const signature = generateOAuth1Signature('POST', url, {}, {
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret
  })
  
  // Create Authorization header
  const authHeader = createOAuth1Header(
    consumerKey,
    accessToken,
    signature,
    timestamp,
    nonce
  )
  
  return {
    body: formData,
    headers: {
      'Authorization': authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(formData).toString()
    }
  }
}

// Create Twitter video upload request using OAuth 1.0a
export async function createTwitterVideoUploadRequest(
  command: 'INIT' | 'APPEND' | 'FINALIZE',
  videoBuffer: Buffer,
  mimeType: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  mediaId?: string,
  segmentIndex?: number
): Promise<any> {
  // For STATUS requests, use GET with query parameters
  const baseUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const url = (command as any) === 'STATUS' ? `${baseUrl}?command=STATUS&media_id=${mediaId}` : baseUrl        
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')

  console.log(`[OAuth] Creating ${command} request with credentials:`, {
    consumerKey: consumerKey ? `${consumerKey.substring(0, 8)}...` : 'MISSING',
    accessToken: accessToken ? `${accessToken.substring(0, 8)}...` : 'MISSING',
    timestamp,
    nonce: nonce.substring(0, 8) + '...'
  })

  let params: Record<string, string> = {
    command: command
  }

  if (command === 'INIT') {
    params.media_type = mimeType
    params.total_bytes = videoBuffer.length.toString()
    params.media_category = 'tweet_video'
  } else if (command === 'APPEND') {
    params.media_id = mediaId!
    params.segment_index = segmentIndex!.toString()
  } else if (command === 'FINALIZE') {
    params.media_id = mediaId!
  } else if (command === 'STATUS') {
    // For STATUS, parameters are in URL, not body
    params = {}
  }

  // Add OAuth parameters to the params for signature generation
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0'
  }

  // For APPEND requests (multipart), only include OAuth params in signature
  // For STATUS requests (GET), include OAuth params + URL query params
  // For INIT/FINALIZE requests (URL-encoded), include both OAuth and request params
  let allParams
  if (command === 'APPEND') {
    allParams = oauthParams
  } else if ((command as any) === 'STATUS') {
    // For STATUS, include OAuth params + query params from URL
    allParams = { ...oauthParams, command: 'STATUS', media_id: mediaId! }
  } else {
    allParams = { ...params, ...oauthParams }
  }

  // Create parameter string for signature
  const paramsRecord = allParams as Record<string, string>
  const paramString = Object.keys(paramsRecord)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(paramsRecord[key])}`)
    .join('&')

  // Create signature base string
  const httpMethod = (command as any) === 'STATUS' ? 'GET' : 'POST'
  const signatureBaseString = `${httpMethod}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`

  console.log(`[OAuth] Signature generation for ${command}:`, {
    paramString: paramString.substring(0, 100) + '...',
    signatureBaseString: signatureBaseString.substring(0, 100) + '...',
    signingKey: signingKey.substring(0, 20) + '...'
  })

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64')

  console.log(`[OAuth] Generated signature for ${command}:`, signature.substring(0, 20) + '...')

  // Create Authorization header
  const authHeader = createOAuth1Header(
    consumerKey,
    accessToken,
    signature,
    timestamp,
    nonce
  )

  console.log(`[OAuth] Authorization header for ${command}:`, authHeader.substring(0, 100) + '...')

  let body: any
  let headers: Record<string, string> = {
    'Authorization': authHeader
  }

  if (command === 'APPEND') {
    // For APPEND, we need to send the video chunk as binary data
    const formData = new FormData()
    formData.append('command', command)
    formData.append('media_id', mediaId!)
    formData.append('segment_index', segmentIndex!.toString())
    // Convert Node Buffer to ArrayBuffer for Blob compatibility
    const videoArrayBuffer = videoBuffer.buffer.slice(
      videoBuffer.byteOffset,
      videoBuffer.byteOffset + videoBuffer.byteLength
    ) as ArrayBuffer
    const videoBlob = new Blob([videoArrayBuffer], { type: 'video/mp4' })
    formData.append('media', videoBlob, 'chunk.mp4')

    body = formData
  } else {
    // For INIT and FINALIZE, send as URL-encoded form data
    const formParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      formParams.append(key, params[key])
    })

    body = formParams.toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  console.log(`[OAuth] Making ${command} request to:`, url)
  console.log(`[OAuth] Request headers:`, {
    Authorization: headers.Authorization?.substring(0, 50) + '...',
    'Content-Type': headers['Content-Type'] || 'not set'
  })
  console.log(`[OAuth] Request body type:`, typeof body)
  console.log(`[OAuth] Request body preview:`,
    typeof body === 'string' ? body.substring(0, 100) + '...' : 'FormData object'
  )

  const response = await fetch(url, {
    method: (command as any) === 'STATUS' ? 'GET' : 'POST',
    headers,
    body: (command as any) === 'STATUS' ? undefined : body
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Twitter video upload ${command} failed:`, errorText)
    throw new Error(`Twitter video upload ${command} failed: ${response.status}`)
  }

  if (command === 'INIT' || command === 'FINALIZE' || (command as any) === 'STATUS') {
    return await response.json()
  }

  return { success: true }
}
