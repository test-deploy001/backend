const bcrypt = require('bcrypt');

const password = 'adminPassword'; // The plain-text password you want to hash

bcrypt.hash(password, 10, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }

  // Now you can manually insert the hashedPassword into the database
  console.log('Hashed Password:', hashedPassword);

  // This hashedPassword can be inserted into the database
});
