CREATE TABLE IF NOT EXISTS shuttles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shuttle_number INT UNIQUE NOT NULL,
      latitude DECIMAL(10, 8) DEFAULT NULL,
      longitude DECIMAL(11, 8) DEFAULT NULL,
      destination VARCHAR(255) DEFAULT '',
      available_seats INT DEFAULT 0,
      remarks VARCHAR(255) DEFAULT '',
      estimated_arrival VARCHAR(255) DEFAULT '', -- New column for ETA
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);