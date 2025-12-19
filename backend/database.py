"""Database connection utilities"""
import os
from typing import Optional
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """
    Create and return a MySQL database connection.
    Returns None if connection fails (allows app to start without DB).
    """
    try:
        connection = pymysql.connect(
            host=os.getenv("DB_HOST", "mysql"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "bankountable_user"),
            password=os.getenv("DB_PASSWORD", "bankountable_password"),
            database=os.getenv("DB_NAME", "bankountable_db"),
            cursorclass=DictCursor,
            charset="utf8mb4",
            connect_timeout=5,
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def test_db_connection() -> bool:
    """Test if database connection works"""
    conn = get_db_connection()
    if conn:
        conn.close()
        return True
    return False


