-- ─── SportTracker — Schéma BDD ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(100)  DEFAULT '',
  age            INT           DEFAULT 0,
  gender         ENUM('male','female') DEFAULT 'male',
  height         DECIMAL(5,1)  DEFAULT 0,
  weight         DECIMAL(5,1)  DEFAULT 0,
  activity_level VARCHAR(20)   DEFAULT 'moderate',
  goal           VARCHAR(20)   DEFAULT 'maintain',
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ligne unique (profil utilisateur)
INSERT IGNORE INTO profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS workouts (
  id         VARCHAR(50)  PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  type       VARCHAR(50)  DEFAULT 'strength',
  date       DATE         NOT NULL,
  duration   INT,
  difficulty TINYINT      DEFAULT 3,
  notes      TEXT,
  exercises  JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);

CREATE TABLE IF NOT EXISTS weight_entries (
  id         VARCHAR(50)  PRIMARY KEY,
  date       DATE         NOT NULL UNIQUE,
  weight     DECIMAL(5,1) NOT NULL,
  note       VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);

CREATE TABLE IF NOT EXISTS diet_days (
  date       DATE PRIMARY KEY,
  meals      JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
