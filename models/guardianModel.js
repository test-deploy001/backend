const db = require('../config/db');

// Get guardian details by guardianId
const getGuardianById = (guardianId, callback) => {
    const sql = `
      SELECT firstname, middlename, lastname, contact, guardianAddress, profileImage
      FROM guardians
      WHERE id = ?
    `;
    db.execute(sql, [guardianId], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results.length > 0 ? results[0] : null);
    });
  };
  

const getUserWithGuardian = (userId, callback) => {
    const sql = `
      SELECT u.id AS userId, g.id AS guardianId, u.email
      FROM users u
      LEFT JOIN guardians g ON u.id = g.user_id
      WHERE u.id = ?
    `;
    db.execute(sql, [userId], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results.length > 0 ? results[0] : null);
    });
  };

  const updateGuardianById = (guardianId, updatedData, callback) => {
    const { firstName, middleName, lastName, contact, guardianAddress, profileImage } = updatedData;
  
    const sql = `
      UPDATE guardians
      SET firstname = ?, middlename = ?, lastname = ?, contact = ?, guardianAddress = ?, profileImage = ?
      WHERE id = ?
    `;
  
    db.execute(sql, [
      firstName,
      middleName,
      lastName,
      contact,
      guardianAddress,
      profileImage,
      guardianId,
    ], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
  };
  
  module.exports = { getGuardianById, getUserWithGuardian, updateGuardianById };
