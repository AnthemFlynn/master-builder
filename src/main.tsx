import { createRoot } from 'react-dom/client'
import './index.css'
import KingdomBuilder from './KingdomBuilder.tsx'

createRoot(document.getElementById('root')!).render(
    <KingdomBuilder />
)
