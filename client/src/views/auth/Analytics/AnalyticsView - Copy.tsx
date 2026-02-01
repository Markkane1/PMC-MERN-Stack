import React from 'react'
import './KPIDashboard.css'

export const KPIDashboardBase: React.FC = () => {
    return (
        <div style={{ height: '100vh', width: '100%', overflow: 'hidden' }}>
            <iframe
                src="/index.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                }}
                title="Landing Page"
            ></iframe>
        </div>
    )
}
