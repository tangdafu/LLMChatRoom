import axios from 'axios'

// Create an axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9090/api',
  timeout: 30000,
})

/**
 * Send a message to the chat API using OpenAI format
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - The selected model
 * @returns {Promise<ReadableStream>} - Stream response
 */
export async function sendMessage(messages, model) {
  try {
    const response = await apiClient.post(
      '/chat',
      {
        model: model,
        messages: messages,
        stream: false
      },
      { responseType: 'stream' }
    )
    return response.data
  } catch (error) {
    throw new Error(`Failed to send message: ${error.message}`)
  }
}


/**
 * Process the stream using the Fetch API with proper SSE handling
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - The selected model
 * @param {function} onChunk - Callback function to handle each chunk of data
 * @param {function} onComplete - Callback function when the stream is complete
 * @param {function} onError - Callback function to handle errors
 * @returns {function} - Function to cancel the request
 */
export function streamMessageWithFetch(messages, model, onChunk, onComplete, onError) {
  const controller = new AbortController();
  
  fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9090/api'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true
    }),
    signal: controller.signal
  })
  .then(async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = ''; // Buffer to store incomplete lines

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining data in the buffer
          if (buffer) {
            processSSELine(buffer, onChunk);
          }
          onComplete();
          break;
        }
        
        // Decode the current chunk and add it to the buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          processSSELine(line, onChunk);
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      reader.releaseLock();
    }
  })
  .catch((error) => {
    if (error.name !== 'AbortError') {
      onError(error);
    }
  });
  
  // Return a function to cancel the request
  return () => controller.abort();
}

/**
 * Process a single SSE line
 * @param {string} line - A single line from the SSE stream
 * @param {function} onChunk - Callback function to handle each chunk of data
 */
function processSSELine(line, onChunk) {
  // Skip empty lines
  if (line.trim() === '') {
    return;
  }
  
  // Check for the end signal
  if (line === 'data: [DONE]') {
    return;
  }
  // Process data lines
  if (line.startsWith('data:')) {
    onChunk(line);
  }
}

export default {
  sendMessage,
  streamMessageWithFetch
}