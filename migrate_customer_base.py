"""
Database Migration: Add Customer Base Columns
Adds columns to store customer base analysis data
"""

import sqlite3
import os

def migrate():
    """Add customer base columns to analyses table"""
    db_path = 'buizmind.db'
    
    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found: {db_path}")
        print("[INFO] Please run init_db.py first to create the database")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("[INFO] Starting customer base migration...")
        
        # Check if columns already exist
        cursor.execute('PRAGMA table_info(analyses)')
        existing_columns = [column[1] for column in cursor.fetchall()]
        
        columns_to_add = {
            'customer_score': 'REAL DEFAULT 0',
            'apartments_count': 'INTEGER DEFAULT 0',
            'education_count': 'INTEGER DEFAULT 0',
            'offices_count': 'INTEGER DEFAULT 0',
            'transit_count': 'INTEGER DEFAULT 0',
            'heatmap_data': 'TEXT'  # JSON string
        }
        
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"[INFO] Adding column: {column_name}")
                cursor.execute(f'ALTER TABLE analyses ADD COLUMN {column_name} {column_type}')
                added_count += 1
            else:
                print(f"[SKIP] Column already exists: {column_name}")
        
        conn.commit()
        
        if added_count > 0:
            print(f"\n[SUCCESS] Migration successful! Added {added_count} new columns.")
        else:
            print("\n[SUCCESS] All columns already exist. No changes needed.")
        
        # Verify the migration
        cursor.execute('PRAGMA table_info(analyses)')
        all_columns = cursor.fetchall()
        print(f"\n[INFO] Total columns in analyses table: {len(all_columns)}")
        
        return True
        
    except sqlite3.OperationalError as e:
        print(f"\n[ERROR] Migration failed: {e}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Customer Base Migration Script")
    print("=" * 60)
    print()
    
    success = migrate()
    
    if success:
        print("\n[INFO] You can now use customer base features in BizMind!")
    else:
        print("\n[ERROR] Migration failed. Please check the errors above.")
    
    print()
    print("=" * 60)
