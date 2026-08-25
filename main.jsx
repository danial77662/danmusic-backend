import React from 'react';
import ReactDOM from 'react-dom/client';
import DanMusic from './Dan.jsx';
import SubscriptionGate from './SubscriptionGate.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SubscriptionGate>
      <DanMusic />
    </SubscriptionGate>
  </React.StrictMode>
);