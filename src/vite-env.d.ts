/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWILIO_ACCOUNT_SID: string
  readonly VITE_TWILIO_AUTH_TOKEN: string
  readonly VITE_TWILIO_PHONE_NUMBER: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_OPENROUTER_DIAGNOSIS_API_KEY: string
  readonly VITE_OPENROUTER_CHATBOT_API_KEY: string
  readonly VITE_OPENROUTER_RECOMMENDATIONS_API_KEY: string
  readonly VITE_IP_CAMERA_URL: string
  // add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
