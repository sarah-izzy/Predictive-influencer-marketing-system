import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import TicketSelectionPage from './pages/ticket-selection';
import BookingConfirmationPage from './pages/booking-confirmation';
import AttendeeDetailsPage from './pages/attendee-details';

ReactDOM.render(
  <Router>
    <Switch>
      <Route exact path="/" component={TicketSelectionPage} />
      <Route path="/booking-confirmation" component={BookingConfirmationPage} />
      <Route path="/attendee-details" component={AttendeeDetailsPage} />
    </Switch>
  </Router>,
  document.getElementById('root')
);