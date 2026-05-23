-- ============================================================
-- Progressive Student Dashboard - MySQL Database Schema
-- Database: student_dashboard_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS student_dashboard_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_dashboard_db;

-- ============================================================
-- 1. Users table
--    Stores both students and mentors (role-based)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    password    VARCHAR(128) NOT NULL,
    last_login  DATETIME(6)  NULL,
    is_superuser TINYINT(1)  NOT NULL DEFAULT 0,
    username    VARCHAR(150) NOT NULL UNIQUE,
    first_name  VARCHAR(150) NOT NULL DEFAULT '',
    last_name   VARCHAR(150) NOT NULL DEFAULT '',
    is_staff    TINYINT(1)   NOT NULL DEFAULT 0,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    date_joined DATETIME(6)  NOT NULL,
    email       VARCHAR(254) NOT NULL UNIQUE,
    role        VARCHAR(10)  NOT NULL DEFAULT 'student'
                COMMENT 'Role: student or mentor',
    avatar      VARCHAR(500) NOT NULL DEFAULT '',
    bio         LONGTEXT     NOT NULL,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Courses table
--    Each course belongs to a mentor
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description LONGTEXT     NOT NULL,
    thumbnail   VARCHAR(500) NOT NULL DEFAULT '',
    mentor_id   BIGINT       NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    is_published TINYINT(1)  NOT NULL DEFAULT 0,
    CONSTRAINT fk_courses_mentor
        FOREIGN KEY (mentor_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_courses_mentor (mentor_id),
    INDEX idx_courses_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Enrollments table (Many-to-Many: student <-> course)
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT NOT NULL,
    course_id   BIGINT NOT NULL,
    enrolled_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_enrollment (student_id, course_id),
    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE,
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Lessons table
--    Each lesson belongs to a course
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT       NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     LONGTEXT     NOT NULL,
    video_url   VARCHAR(500) NOT NULL DEFAULT '',
    duration    INT          NOT NULL COMMENT 'Duration in minutes',
    `order`     INT          NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    UNIQUE KEY uk_lesson_order (course_id, `order`),
    CONSTRAINT fk_lessons_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE,
    INDEX idx_lessons_course (course_id),
    INDEX idx_lessons_order (course_id, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Student progress table
--    Tracks per-student lesson completion & time spent
-- ============================================================
CREATE TABLE IF NOT EXISTS student_progress (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id   BIGINT       NOT NULL,
    lesson_id    BIGINT       NOT NULL,
    completed    TINYINT(1)   NOT NULL DEFAULT 0,
    time_spent   INT          NOT NULL DEFAULT 0 COMMENT 'Time spent in minutes',
    completed_at DATETIME(6)  NULL,
    updated_at   DATETIME(6)  NOT NULL,
    UNIQUE KEY uk_progress (student_id, lesson_id),
    CONSTRAINT fk_progress_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_progress_lesson
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        ON DELETE CASCADE,
    INDEX idx_progress_student (student_id),
    INDEX idx_progress_completed (student_id, completed),
    INDEX idx_progress_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Activity events table
--    Time-series log of all learning activities
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT       NOT NULL,
    lesson_id   BIGINT       NOT NULL,
    event_type  VARCHAR(20)  NOT NULL
                COMMENT 'lesson_start, lesson_complete, lesson_time',
    duration    INT          NOT NULL DEFAULT 0 COMMENT 'Duration in minutes',
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT fk_activity_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_activity_lesson
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        ON DELETE CASCADE,
    INDEX idx_activity_student (student_id),
    INDEX idx_activity_date (student_id, created_at),
    INDEX idx_activity_type (event_type),
    INDEX idx_activity_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Recommendations table
--    Personalized course/lesson suggestions for students
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT       NOT NULL,
    course_id   BIGINT       NULL,
    lesson_id   BIGINT       NULL,
    reason      VARCHAR(300) NOT NULL,
    score       DOUBLE       NOT NULL DEFAULT 0.0
                COMMENT 'Recommendation relevance score',
    is_read     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT fk_recs_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recs_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_recs_lesson
        FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        ON DELETE SET NULL,
    INDEX idx_recs_student (student_id),
    INDEX idx_recs_read (student_id, is_read),
    INDEX idx_recs_score (student_id, score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
