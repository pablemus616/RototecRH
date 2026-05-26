import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data ?? err.message)
    return Promise.reject(err)
  }
)

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
