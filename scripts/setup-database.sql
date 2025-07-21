-- Create the shuttles table if it doesn't exist
CREATE TABLE IF NOT EXISTS shuttles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shuttle_number INT UNIQUE NOT NULL,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  destination VARCHAR(255) DEFAULT '',
  available_seats INT DEFAULT 0,
);
