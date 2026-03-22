"""
BizMind - Database Module
Handles SQLite database connections and schema management
"""

import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime
import json


class Database:
    """SQLite database manager for BizMind"""
    
    def __init__(self, db_path='buizmind.db'):
        """Initialize database connection"""
        self.db_path = db_path
        self.init_db()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def init_db(self):
        """Initialize database schema"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            ''')
            
            # Create analyses table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    business_name TEXT NOT NULL,
                    business_type TEXT NOT NULL,
                    location TEXT NOT NULL,
                    latitude REAL,
                    longitude REAL,
                    radius INTEGER,
                    owner_type TEXT,
                    budget REAL,
                    success_score REAL,
                    recommendation TEXT,
                    features_json TEXT,
                    ai_insights_json TEXT,
                    competitors_json TEXT,
                    strategy_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    target_launch_date TEXT,
                    action_items_json TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Safely add new columns to existing DB
            try:
                cursor.execute("ALTER TABLE analyses ADD COLUMN target_launch_date TEXT")
            except sqlite3.OperationalError:
                pass
            try:
                cursor.execute("ALTER TABLE analyses ADD COLUMN action_items_json TEXT")
            except sqlite3.OperationalError:
                pass
            
            # Create analysis_progress table for real-time tracking across workers
            # Recreated to use task_id as primary key to allow concurrent analyses
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analysis_progress (
                    task_id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    step INTEGER DEFAULT 0,
                    status TEXT,
                    progress INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')

            # ─── Feature 6: Business Health Dashboard ───────────────────────
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS business_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    daily_revenue REAL DEFAULT 0,
                    daily_expenses REAL DEFAULT 0,
                    customer_count INTEGER DEFAULT 0,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_business_metrics_analysis
                ON business_metrics(analysis_id)
            ''')

            # ─── Feature 5: Market Tracking Snapshots ───────────────────────
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS market_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_id INTEGER NOT NULL,
                    snapshot_json TEXT,
                    alerts_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
                )
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_market_snapshots_analysis
                ON market_snapshots(analysis_id)
            ''')

            # ─── Feature 10: Feedback Learning Loop ─────────────────────────
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    analysis_id INTEGER,
                    success_status TEXT,
                    actual_monthly_revenue REAL,
                    issues TEXT,
                    additional_notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE SET NULL
                )
            ''')
            
            # Create indexes for performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_analyses_user_id 
                ON analyses(user_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_analyses_created_at 
                ON analyses(created_at DESC)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_users_email 
                ON users(email)
            ''')
            
            print("[INFO] Database initialized successfully")
    
    def create_user(self, email, password_hash, full_name):
        """Create a new user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
                (email, password_hash, full_name)
            )
            return cursor.lastrowid
    
    def get_user_by_email(self, email):
        """Get user by email"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def update_last_login(self, user_id):
        """Update user's last login timestamp"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE users SET last_login = ? WHERE id = ?',
                (datetime.now(), user_id)
            )
    
    def create_analysis(self, user_id, business_name, business_type, location,
                       latitude=None, longitude=None, radius=None, owner_type=None,
                       budget=None, success_score=None, recommendation=None, features=None,
                       ai_insights=None, competitors=None, strategy=None):
        """Save an analysis to the database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO analyses (
                    user_id, business_name, business_type, location,
                    latitude, longitude, radius, owner_type, budget,
                    success_score, recommendation, features_json,
                    ai_insights_json, competitors_json, strategy_json, action_items_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, business_name, business_type, location,
                latitude, longitude, radius, owner_type, budget,
                success_score, recommendation,
                json.dumps(features) if features else None,
                json.dumps(ai_insights) if ai_insights else None,
                json.dumps(competitors) if competitors else None,
                json.dumps(strategy) if strategy else None,
                json.dumps(strategy.get("action_items", "")) if strategy else None
            ))
            return cursor.lastrowid
    
    def get_user_analyses(self, user_id, limit=20, offset=0):
        """Get user's analysis history with pagination"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, business_name, business_type, location,
                       success_score, recommendation, created_at
                FROM analyses
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (user_id, limit, offset))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_analysis_by_id(self, analysis_id, user_id):
        """Get a specific analysis by ID (with user verification)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM analyses
                WHERE id = ? AND user_id = ?
            ''', (analysis_id, user_id))
            
            row = cursor.fetchone()
            if row:
                analysis = dict(row)
                # Parse JSON fields
                if analysis.get('features_json'):
                    analysis['features'] = json.loads(analysis['features_json'])
                if analysis.get('ai_insights_json'):
                    analysis['ai_insights'] = json.loads(analysis['ai_insights_json'])
                if analysis.get('competitors_json'):
                    analysis['competitors'] = json.loads(analysis['competitors_json'])
                if analysis.get('strategy_json'):
                    analysis['strategy'] = json.loads(analysis['strategy_json'])
                return analysis
            return None
    
    def delete_analysis(self, analysis_id, user_id):
        """Delete an analysis (with user verification)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM analyses
                WHERE id = ? AND user_id = ?
            ''', (analysis_id, user_id))
            return cursor.rowcount > 0
    
    def get_analysis_count(self, user_id):
        """Get total number of analyses for a user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM analyses
                WHERE user_id = ?
            ''', (user_id,))
            row = cursor.fetchone()
            return row['count'] if row else 0

    def set_analysis_progress(self, task_id, user_id, step, status, progress):
        """Update or create analysis progress for a task"""
        if not task_id: return
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO analysis_progress (task_id, user_id, step, status, progress, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(task_id) DO UPDATE SET
                    step = excluded.step,
                    status = excluded.status,
                    progress = excluded.progress,
                    updated_at = excluded.updated_at
            ''', (task_id, user_id, step, status, progress, datetime.now()))

    def get_analysis_progress(self, task_id):
        """Get current progress for a task"""
        if not task_id: return None
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM analysis_progress WHERE task_id = ?', (task_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def clear_analysis_progress(self, task_id):
        """Remove progress entry for a task"""
        if not task_id: return
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM analysis_progress WHERE task_id = ?', (task_id,))

    # =========================================================================
    # BUSINESS HEALTH DASHBOARD (Feature 6)
    # =========================================================================

    def add_business_metric(self, analysis_id, user_id, date, daily_revenue,
                            daily_expenses, customer_count, notes=None):
        """Log a day's business performance"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO business_metrics
                    (analysis_id, user_id, date, daily_revenue, daily_expenses,
                     customer_count, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (analysis_id, user_id, date, daily_revenue, daily_expenses,
                  customer_count, notes))
            return cursor.lastrowid

    def get_business_metrics(self, analysis_id, user_id, days=30):
        """Get recent business metrics for an analysis"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM business_metrics
                WHERE analysis_id = ? AND user_id = ?
                ORDER BY date DESC
                LIMIT ?
            ''', (analysis_id, user_id, days))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    # =========================================================================
    # MARKET TRACKING (Feature 5)
    # =========================================================================

    def save_market_snapshot(self, analysis_id, snapshot_json, alerts_json):
        """Save a new market snapshot"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO market_snapshots (analysis_id, snapshot_json, alerts_json)
                VALUES (?, ?, ?)
            ''', (analysis_id, snapshot_json, alerts_json))
            return cursor.lastrowid

    def get_latest_snapshot(self, analysis_id):
        """Get the most recent market snapshot for an analysis"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM market_snapshots
                WHERE analysis_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            ''', (analysis_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_snapshot_history(self, analysis_id, limit=10):
        """Get list of past snapshots"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, created_at, alerts_json FROM market_snapshots
                WHERE analysis_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (analysis_id, limit))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    # =========================================================================
    # FEEDBACK LEARNING LOOP (Feature 10)
    # =========================================================================

    def save_feedback(self, user_id, analysis_id, success_status,
                      actual_revenue=None, issues=None, notes=None):
        """Save user feedback on a past analysis"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO feedback
                    (user_id, analysis_id, success_status,
                     actual_monthly_revenue, issues, additional_notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, analysis_id, success_status,
                  actual_revenue, issues, notes))
            return cursor.lastrowid

    def get_user_feedback(self, user_id):
        """Get all feedback submitted by a user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT f.*, a.business_name, a.business_type, a.location,
                       a.success_score
                FROM feedback f
                LEFT JOIN analyses a ON f.analysis_id = a.id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            ''', (user_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_feedback_stats(self):
        """Aggregate feedback stats (for accuracy tracking)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN success_status='succeeded' THEN 1 ELSE 0 END) as succeeded,
                    SUM(CASE WHEN success_status='failed'    THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN success_status='ongoing'   THEN 1 ELSE 0 END) as ongoing,
                    AVG(actual_monthly_revenue) as avg_actual_revenue
                FROM feedback
            ''')
            row = cursor.fetchone()
            return dict(row) if row else {}


# Global database instance
db = Database()

