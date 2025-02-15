import React from 'react';

const BookingConfirmation = ({ bookingDetails }) => {
  return (
    <div>
      <h1>Booking Confirmation</h1>
      <p>Thank you for your booking!</p>
      <div>
        <h2>Booking Details:</h2>
        <p><strong>Name:</strong> {bookingDetails.name}</p>
        <p><strong>Email:</strong> {bookingDetails.email}</p>
        <p><strong>Phone:</strong> {bookingDetails.phone}</p>
        <p><strong>Event:</strong> {bookingDetails.event}</p>
        <p><strong>Date:</strong> {bookingDetails.date}</p>
        <p><strong>Seats:</strong> {bookingDetails.seats}</p>
      </div>
    </div>
  );
};

export default BookingConfirmation;