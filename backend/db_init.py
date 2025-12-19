"""Script para inicializar la base de datos"""
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def get_db_connection(use_root=False):
    """Crear conexión a la base de datos"""
    if use_root:
        user = "root"
        password = os.getenv("MYSQL_ROOT_PASSWORD", "root_password")
    else:
        user = os.getenv("DB_USER", "bankountable_user")
        password = os.getenv("DB_PASSWORD", "bankountable_password")
    
    return pymysql.connect(
        host=os.getenv("DB_HOST", "mysql"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=user,
        password=password,
        database=os.getenv("DB_NAME", "bankountable_db") if not use_root else None,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

def init_database():
    """Inicializar la base de datos ejecutando el schema SQL"""
    import time
    
    # Primero intentar con root para crear el usuario si no existe
    max_attempts = 30
    root_conn = None
    
    # Esperar a que MySQL esté listo
    for attempt in range(max_attempts):
        try:
            root_conn = get_db_connection(use_root=True)
            break
        except Exception as e:
            if attempt < max_attempts - 1:
                print(f"Esperando a MySQL... (intento {attempt + 1}/{max_attempts})")
                time.sleep(2)
            else:
                print(f"⚠️ No se pudo conectar a MySQL con root, intentando con usuario normal...")
                break
    
    # Crear usuario y base de datos si usamos root
    if root_conn:
        try:
            db_name = os.getenv("DB_NAME", "bankountable_db")
            db_user = os.getenv("DB_USER", "bankountable_user")
            db_password = os.getenv("DB_PASSWORD", "bankountable_password")
            
            with root_conn.cursor() as cursor:
                # Crear base de datos si no existe
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                
                # Crear usuario si no existe
                cursor.execute(f"CREATE USER IF NOT EXISTS '{db_user}'@'%' IDENTIFIED BY '{db_password}'")
                
                # Dar permisos
                cursor.execute(f"GRANT ALL PRIVILEGES ON {db_name}.* TO '{db_user}'@'%'")
                cursor.execute("FLUSH PRIVILEGES")
                
                root_conn.commit()
                print(f"✅ Usuario {db_user} y base de datos {db_name} creados/verificados")
        except Exception as e:
            print(f"⚠️ Error al crear usuario/base de datos (puede que ya existan): {e}")
        finally:
            root_conn.close()
    
    # Intentar conectar con el usuario normal, si falla usar root
    connection = None
    try:
        connection = get_db_connection(use_root=False)
        print("✅ Conectado con usuario normal")
    except Exception as e:
        print(f"⚠️ No se pudo conectar con usuario normal, usando root: {e}")
        # Si falla, usar root para inicializar
        connection = get_db_connection(use_root=True)
        # Seleccionar la base de datos
        with connection.cursor() as cursor:
            db_name = os.getenv("DB_NAME", "bankountable_db")
            cursor.execute(f"USE {db_name}")
        print("✅ Conectado con root")
    
    try:
        # Leer el archivo schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        if not connection:
            raise Exception("No se pudo conectar a la base de datos")
        
        try:
            with connection.cursor() as cursor:
                # Ejecutar cada statement SQL (separados por ;)
                statements = [s.strip() for s in schema_sql.split(';') if s.strip() and not s.strip().startswith('--')]
                for statement in statements:
                    if statement:
                        try:
                            cursor.execute(statement)
                        except Exception as e:
                            # Ignorar errores de "table already exists"
                            if "already exists" not in str(e).lower():
                                print(f"Advertencia al ejecutar statement: {e}")
                connection.commit()
                print("✅ Base de datos inicializada correctamente")
        finally:
            connection.close()
    except Exception as e:
        print(f"❌ Error al inicializar la base de datos: {e}")
        import traceback
        traceback.print_exc()
        # No hacer raise para que el servidor pueda iniciar aunque falle la inicialización
        print("⚠️ Continuando sin inicializar la base de datos...")

if __name__ == "__main__":
    init_database()

