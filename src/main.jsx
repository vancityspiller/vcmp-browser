import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import { CustomProvider } from 'rsuite';
import './main.less';

// ========================================================= //

ReactDOM.createRoot(document.getElementById('root')).render(

    <CustomProvider theme='dark'>
        <App />
    </CustomProvider>
)
