import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages用: リポジトリ名に合わせて変更してください
  // 例: https://yutate.github.io/resonance-map/ なら '/resonance-map/'
  base: '/resonance-map/',
})
