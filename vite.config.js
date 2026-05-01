import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 👇 여기부터 추가/수정해 주세요! (문지기에게 VIP 주소 알려주기)
  server: {
    host: true, // 외부 접속 허용
    allowedHosts: [
      "jjufarm.tplinkdns.com" // 쭈님이 만드신 주소를 똑같이 적어주세요!
    ]
  }
})