// models/userModel.js
const db = require('../config/db');

// Insert into the users table
const createUser = (userData, callback) => {
  const sql = `
    INSERT INTO users (email, password, userType, emailVerified)
    VALUES (?, ?, ?, ?)
  `;

  db.execute(
    sql,
    [userData.email, userData.password, userData.userType, userData.emailVerified || false],
    (err, result) => {
      if (err) {
        console.error('Error executing createUser query:', err);
        return callback(err);
      }
      callback(null, result);
    }
  );
};

const createPediatrician = (pediatricianData, callback) => {
  const sql = `
    INSERT INTO pediatricians (user_id, firstname, middlename, lastname, extension, contact, clinicAddress, specialization)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    sql,
    [
      pediatricianData.userId,
      pediatricianData.firstname,
      pediatricianData.middlename,
      pediatricianData.lastname,
      pediatricianData.extension,
      pediatricianData.contact,
      pediatricianData.clinicAddress, // New field
      pediatricianData.specialization, // New field
    ],
    (err, result) => {
      if (err) {
        console.error('Error executing createPediatrician query:', err);
        return callback(err);
      }
      callback(null, result);
    }
  );
};


// Insert into the guardians table
const createGuardian = (guardianData, callback) => {
  const sql = `
    INSERT INTO guardians (user_id, firstname, middlename, lastname, extension, contact, guardianAddress)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    sql,
    [
      guardianData.userId, guardianData.firstname, guardianData.middlename,
      guardianData.lastname, guardianData.extension, guardianData.contact, guardianData.guardianAddress,
    ],
    (err, result) => {
      if (err) {
        console.error('Error executing createGuardian query:', err);
        return callback(err);
      }
      callback(null, result);
    }
  );
};

// Insert into the patients table
const createPatient = (patientData, callback) => {
  const sql = `
    INSERT INTO patients (guardian_id, patientName, patientAge, birthdate, sex, birthplace, religion, address,
                          fatherName, fatherAge, fatherOccupation, motherName, motherAge, motherOccupation,
                          cellphone, patientEmail, informant, relation, medicalHistory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    sql,
    [
      patientData.guardianId, patientData.patientName, patientData.patientAge, patientData.birthdate,
      patientData.sex, patientData.birthplace, patientData.religion, patientData.address,
      patientData.fatherName, patientData.fatherAge, patientData.fatherOccupation,
      patientData.motherName, patientData.motherAge, patientData.motherOccupation,
      patientData.cellphone, patientData.patientEmail, patientData.informant,
      patientData.relation, patientData.medicalHistory,
    ],
    (err, result) => {
      if (err) {
        console.error('Error executing createPatient query:', err);
        return callback(err);
      }
      callback(null, result);
    }
  );
};


const updateEmailVerification = (email, callback) => {
  const sql = `UPDATE users SET emailVerified = true WHERE email = ?`;

  db.execute(sql, [email], (err, result) => {
    if (err) {
      console.error(`Error updating email verification for email ${email}:`, err);
      return callback(err, null);
    }

    if (result.affectedRows === 0) {
      console.warn(`No user found with email: ${email}`);
      return callback(null, { message: 'No user found with the provided email' });
    }

    console.log(`Email verification updated successfully for ${email}`);
    callback(null, result);
  });
};

const findUserByEmail = (email, callback) => {
  const sql = `SELECT * FROM users WHERE email = ?`;

  db.execute(sql, [email], (err, result) => {
    if (err) {
      console.error(`Error finding user with email ${email}:`, err);
      return callback(err, null);
    }

    if (result.length === 0) {
      console.warn(`No user found with email: ${email}`);
      return callback(null, null);
    }

    console.log(`User found with email: ${email}`);
    callback(null, result[0]);
  });
};

  module.exports = { createUser, createPediatrician, createGuardian, createPatient, updateEmailVerification, findUserByEmail };
