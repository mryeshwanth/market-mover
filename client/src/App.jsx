import { useState } from 'react'
import './index.css'
import Dashboard from './components/Dashboard'

function App() {
  return (
    <div className="App" style={{ backgroundColor: '#ffffff', minHeight: '100vh', width: '100%' }}>
      <Dashboard />
    </div>
  )
}

export default App
