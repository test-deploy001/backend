const db = require('../config/db');
const moment = require('moment-timezone');

// Accept or decline appointment request
const manageAppointmentRequest = (req, res) => {
  const { appointmentId, status, date, time } = req.body;
  const adminId = req.user.id; // Admin's user ID
  
  if (!appointmentId || !status || !date || !time) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Query to update appointment status (accepted or declined)
  const query = `
    UPDATE appointments
    SET status = ?, updatedAt = NOW()
    WHERE id = ? AND date = ? AND time = ?
  `;

  db.execute(query, [status, appointmentId, date, time], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (status === "accepted") {
      // Update the availability to mark the time as booked
      const updateAvailabilityQuery = `
        UPDATE availability
        SET timeSlots = JSON_REMOVE(timeSlots, '$[?(@ == ?)]')
        WHERE date = ? AND user_id = ?
      `;

      db.execute(updateAvailabilityQuery, [time, date, adminId], (err, result) => {
        if (err) {
          console.error("Error updating availability:", err);
          return res.status(500).json({ message: "Failed to update availability" });
        }
        res.status(200).json({ message: "Appointment accepted and availability updated" });
      });
    } else {
      res.status(200).json({ message: "Appointment declined" });
    }
  });
};

// Admin gets all appointment requests
const getAppointmentRequests = (req, res) => {
  const adminId = req.user.id; // Admin's user ID
  
  const query = `
    SELECT a.id, a.date, a.time, a.status, a.description, p.patientName
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'pending';
  `;

  db.execute(query, [adminId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json(results);
  });
};

module.exports = {
  manageAppointmentRequest,
  getAppointmentRequests,
};
