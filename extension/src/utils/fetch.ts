export const fetchText = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'FETCH_URL',
        payload: { url },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (response && response.text !== undefined) {
          resolve(response.text)
        } else {
          reject(new Error(response?.error || 'Failed to fetch URL via background'))
        }
      }
    )
  })
}
