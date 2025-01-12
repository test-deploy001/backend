const db = require('../config/db');

// Create a new consultation
const createConsultation = ({ date, timeStart, timeEnd, guardianId, patientId, description, email }, callback) => {
  const sql = `
    INSERT INTO consultations (date, timeStart, timeEnd, guardianId, patientId, description, email, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
  `;
  
  db.execute(sql, [date, timeStart, timeEnd, guardianId, patientId, description, email], callback);
};

// Get all consultations for the admin
const getConsultationsForAdmin = (req, res) => {
  consultationModel.getConsultationsForAdmin((err, consultations) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve consultations', error: err });
    }
    res.json({ consultations });
  });
};

// Get consultations for a specific guardian
const getConsultationsForGuardian = (guardianId, callback) => {
  const sql = `
    SELECT 
      c.id AS consultationId,
      c.date,
      TIME_FORMAT(c.timeStart, '%h:%i %p') AS timeStart,
      TIME_FORMAT(c.timeEnd, '%h:%i %p') AS timeEnd,
      c.description,
      c.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      p.patientName AS patientFullName
    FROM consultations c
    JOIN guardians g ON c.guardianId = g.id
    JOIN patients p ON c.patientId = p.id
    WHERE c.guardianId = ?
    ORDER BY c.date ASC, c.timeStart ASC;
  `;

  db.execute(sql, [guardianId], (err, results) => {
    if (err) {
      console.error('Error executing consultations query:', err);
    }
    callback(err, results);
  });
};

// Get consultation by ID
const getConsultationById = (consultationId, callback) => {
  const sql = `
    SELECT 
      c.id AS consultationId,
      c.date,
      c.timeStart,
      c.timeEnd,
      c.description,
      c.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      u.email AS guardianEmail, 
      CONCAT(p.patientName) AS patientFullName,
      p.patientAge
    FROM consultations c
    JOIN guardians g ON c.guardianId = g.id
    JOIN users u ON g.user_id = u.id
    JOIN patients p ON c.patientId = p.id
    WHERE c.id = ?;
  `;

  db.execute(sql, [consultationId], callback);
};

// Delete consultation by ID
const deleteConsultationById = (consultationId, callback) => {
  const sql = `DELETE FROM consultations WHERE id = ?`;

  db.execute(sql, [consultationId], callback);
};

// Get upcoming consultations for a guardian
const getUpcomingConsultationsForGuardian = (guardianId, callback) => {
  const sql = `
    SELECT 
      c.id AS consultationId,
      c.date,
      TIME_FORMAT(c.timeStart, '%h:%i %p') AS timeStart,
      TIME_FORMAT(c.timeEnd, '%h:%i %p') AS timeEnd,
      c.description,
      c.status,
      CONCAT(g.firstname, ' ', g.lastname) AS guardianFullName,
      p.patientName AS patientFullName
    FROM consultations c
    JOIN guardians g ON c.guardianId = g.id
    JOIN patients p ON c.patientId = p.id
    WHERE c.guardianId = ? AND c.date >= CURDATE()
    ORDER BY c.date ASC, c.timeStart ASC;
  `;

  db.execute(sql, [guardianId], callback);
};

// Get guardian ID by user ID
const getGuardianId = (userId, callback) => {
  const sql = `SELECT id FROM guardians WHERE user_id = ?`;
  db.execute(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching guardianId:', err);
      return callback(err, null);
    }
    if (results.length === 0) {
      console.warn('No guardian found for userId:', userId);
      return callback(new Error('Guardian not found'), null);
    }
    callback(null, results[0].id);
  });
};

// Update the status of a consultation
const updateConsultationStatus = (consultationId, status, callback) => {
  const sql = `
    UPDATE consultations
    SET status = ?
    WHERE id = ?
  `;

  db.execute(sql, [status, consultationId], callback);
};

// Get consultation by ID for a pediatrician
const getConsultationByIdForPediatrician = (consultationId, pediatricianId, callback) => {
  const sql = `
    SELECT 
      c.id AS consultationId,
      c.date,
      c.timeStart,
      c.timeEnd,
      c.description,
      c.status,
      CONCAT(g.firstname, ' ', g.middlename, ' ', g.lastname) AS guardianFullName,
      u.email AS guardianEmail,
      CONCAT(p.patientName) AS patientFullName,
      p.patientAge
    FROM consultations c
    JOIN guardians g ON c.guardianId = g.id
    JOIN users u ON g.user_id = u.id
    JOIN patients p ON c.patientId = p.id
    WHERE c.id = ? AND c.pediatricianId = ?;
  `;

  db.execute(sql, [consultationId, pediatricianId], callback);
};

module.exports = {
  createConsultation,
  getConsultationsForAdmin,
  getConsultationsForGuardian,
  getConsultationById,
  deleteConsultationById,
  getUpcomingConsultationsForGuardian,
  getGuardianId,
  updateConsultationStatus,
  getConsultationByIdForPediatrician,
};
