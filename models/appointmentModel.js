const db = require('../config/db');

// Create a new appointment
const createAppointment = ({ date, timeStart, timeEnd, guardianId, patientId, description, email }, callback) => {
  const sql = `
    INSERT INTO appointments (date, timeStart, timeEnd, guardianId, patientId, description, email, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
  `;
  
  db.execute(sql, [date, timeStart, timeEnd, guardianId, patientId, description, email], callback);
};


// Get all appointments for the admin

const getAppointmentsForAdmin = (req, res) => {
  appointmentModel.getAppointmentsForAdmin((err, appointments) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve appointments', error: err });
    }
    res.json({ appointments });
  });
};

const getAppointmentsForGuardian = (guardianId, callback) => {
  const sql = `
    SELECT 
      a.id AS appointmentId,
      a.date,
      TIME_FORMAT(a.timeStart, '%h:%i %p') AS timeStart,
      TIME_FORMAT(a.timeEnd, '%h:%i %p') AS timeEnd,
      a.description,
      a.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      p.patientName AS patientFullName
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN patients p ON a.patientId = p.id
    WHERE a.guardianId = ?
    ORDER BY a.date ASC, a.timeStart ASC;
  `;

  db.execute(sql, [guardianId], (err, results) => {
    if (err) {
      console.error('Error executing appointments query:', err);
    }
    callback(err, results);
  });
};

const getAppointmentById = (appointmentId, callback) => {
  const sql = `
    SELECT 
    a.id AS appointmentId,
    a.date,
    a.timeStart,
    a.timeEnd,
    a.description,
    a.status,
    CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
    u.email AS guardianEmail, -- Fetching email from the users table
    CONCAT(p.patientName) AS patientFullName,
    p.patientAge
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN users u ON g.user_id = u.id -- Joining with the users table
    JOIN patients p ON a.patientId = p.id
    WHERE a.id = ?;

  `;

  db.execute(sql, [appointmentId], callback);
};

const deleteAppointmentById = (appointmentId, callback) => {
  const sql = `DELETE FROM appointments WHERE id = ?`;

  db.execute(sql, [appointmentId], callback);
};

const getUpcomingAppointmentsForGuardian = (guardianId, callback) => {
  const sql = `
    SELECT 
      a.id AS appointmentId,
      a.date,
      TIME_FORMAT(a.timeStart, '%h:%i %p') AS timeStart,
      TIME_FORMAT(a.timeEnd, '%h:%i %p') AS timeEnd,
      a.description,
      a.status,
      CONCAT(g.firstname, ' ', g.lastname) AS guardianFullName,
      p.patientName AS patientFullName
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN patients p ON a.patientId = p.id
    WHERE a.guardianId = ? AND a.date >= CURDATE()
    ORDER BY a.date ASC, a.timeStart ASC;
  `;

  console.log('Executing SQL Query:', sql, 'with Guardian ID:', guardianId); // Log the query and parameters

  db.execute(sql, [guardianId], (err, results) => {
    if (err) {
      console.error('SQL Error:', err); // Log SQL error
    }
    callback(err, results);
  });
};

const getGuardianId = (userId, callback) => {
  const sql = `SELECT id FROM guardians WHERE user_id = ?`; // Map userId to guardianId
  db.execute(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching guardianId:', err);
      return callback(err, null);
    }
    if (results.length === 0) {
      console.warn('No guardian found for userId:', userId);
      return callback(new Error('Guardian not found'), null);
    }
    callback(null, results[0].id); // Return the guardianId
  });
};

// Update the status of an appointment
const updateAppointmentStatus = (appointmentId, status, callback) => {
  const sql = `
    UPDATE appointments
    SET status = ?
    WHERE id = ?
  `;

  console.log("Updating appointment status:", appointmentId, status);  // Add this log

  db.execute(sql, [status, appointmentId], (err, result) => {
    if (err) {
      console.error("Error updating appointment status:", err);  // Log the error
      return callback(err, null);
    }
    console.log("Appointment status updated:", result);  // Log the success result
    callback(null, result);
  });
};

const getAppointmentByIdForPediatrician = (appointmentId, pediatricianId, callback) => {
  const sql = `
    SELECT 
      a.id AS appointmentId,
      a.date,
      a.timeStart,
      a.timeEnd,
      a.description,
      a.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      u.email AS guardianEmail, 
      CONCAT(p.patientName) AS patientFullName,
      p.patientAge
    FROM appointments a
    JOIN guardians g ON a.guardianId = g.id
    JOIN users u ON g.user_id = u.id
    JOIN patients p ON a.patientId = p.id
    WHERE a.id = ? AND a.pediatricianId = ?;
  `;

  db.execute(sql, [appointmentId, pediatricianId], callback);
};

module.exports = { createAppointment, getAppointmentsForAdmin, getAppointmentsForGuardian, getAppointmentById, updateAppointmentStatus,
  deleteAppointmentById, getUpcomingAppointmentsForGuardian, getGuardianId, getAppointmentByIdForPediatrician
 };
