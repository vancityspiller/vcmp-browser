import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import { CustomProvider } from 'rsuite';
import './main.less';

// ========================================================= //

TimeAgo.addDefaultLocale(en)

import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

// ========================================================= //

ReactDOM.createRoot(document.getElementById('root')).render(

    <CustomProvider theme='dark'>
        <App />
    </CustomProvider>
)
