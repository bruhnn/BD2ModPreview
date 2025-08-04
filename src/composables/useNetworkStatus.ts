import { ref } from 'vue'

export function useNetworkStatus() {
  // assume the user is connected by default and then check the connection
  // this is to avoid some delay (~50ms)
  const isConnected = ref(true)

  const endpoints = [
    "https://www.google.com/generate_204",
    'https://raw.githubusercontent.com/octocat/Hello-World/master/README',
    'https://httpbin.org/status/200',
    "https://www.baidu.com/favicon.ico", // china
    'https://www.cloudflare.com/favicon.ico',
    "https://www.bing.com/favicon.ico",
    "https://cn.bing.com/favicon.ico" // china
  ]

  const checkConnection = async () => {
    const controller = new AbortController()

    const checkEndpoint = async (url) => {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      })
      return true
    }

    try {
      const promises = endpoints.map(url => checkEndpoint(url))

      await Promise.any(promises)

      controller.abort()

      isConnected.value = true
    } catch (error) {
      isConnected.value = false
    }
  }
  return {
    isConnected,
    checkConnection
  }
}