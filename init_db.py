"""
BizMind - Database Initialization Script
Run this script to initialize or reset the database
"""

import os
import sys
from database import Database


def init_database(reset=False):
    """Initialize the database"""
    db_path = 'buizmind.db'
    
    if reset and os.path.exists(db_path):
        print(f"[INFO] Removing existing database: {db_path}")
        os.remove(db_path)
    
    print("[INFO] Initializing database...")
    db = Database(db_path)
    
    # Run migrations for existing databases
    print("[INFO] Running database migrations...")
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # Check if strategy_json column exists
        cursor.execute("PRAGMA table_info(analyses)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'strategy_json' not in columns:
            print("[INFO] Adding strategy_json column to analyses table...")
            cursor.execute("ALTER TABLE analyses ADD COLUMN strategy_json TEXT")
            print("[SUCCESS] Migration completed!")
        else:
            print("[INFO] Database schema is up to date")
    
    print("[SUCCESS] Database initialized successfully!")
    print(f"[INFO] Database location: {os.path.abspath(db_path)}")
    
    # Print table info
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # Count users
        cursor.execute('SELECT COUNT(*) as count FROM users')
        user_count = cursor.fetchone()['count']
        
        # Count analyses
        cursor.execute('SELECT COUNT(*) as count FROM analyses')
        analysis_count = cursor.fetchone()['count']
        
        print(f"\n[INFO] Database Statistics:")
        print(f"  - Users: {user_count}")
        print(f"  - Analyses: {analysis_count}")


if __name__ == '__main__':
    # Check for reset flag
    reset = '--reset' in sys.argv or '-r' in sys.argv
    
    if reset:
        confirm = input("⚠️  This will delete all existing data. Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("[INFO] Operation cancelled")
            sys.exit(0)
    
    init_database(reset=reset)
